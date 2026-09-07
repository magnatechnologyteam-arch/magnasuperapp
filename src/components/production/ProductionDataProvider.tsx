"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { BoothProject, BoothStatus, MaterialItem, MaterialUsage } from "@/lib/production/types";
import { INITIAL_BOOTH_PROJECTS, INITIAL_MATERIALS } from "@/lib/production/mock-data";
import { genId } from "@/lib/shared/utils";
import {
  ACTIVE_BOOTH_STATUSES,
  findMaterialConflicts,
  getAvailableStock,
  type MaterialConflict,
} from "@/lib/production/availability";

export type NewBoothProjectInput = {
  name: string;
  namaKlien: string;
  lokasiAcara: string;
  status: BoothStatus;
  tanggalMulai: string;
  tanggalInstalasi: string;
  budget: number;
  materials: MaterialUsage[];
  catatan?: string;
};

type SaveBoothProjectResult = { ok: true } | { ok: false; conflicts: MaterialConflict[] };

type ProductionDataContextValue = {
  materials: MaterialItem[];
  projects: BoothProject[];

  addMaterial: (input: Omit<MaterialItem, "id">) => void;
  updateMaterial: (id: string, input: Omit<MaterialItem, "id">) => void;
  deleteMaterial: (id: string) => void;
  getActiveProjectsForMaterial: (materialId: string) => BoothProject[];
  getAvailableStockFor: (materialId: string, excludeProjectId?: string) => number;

  addProject: (input: NewBoothProjectInput) => SaveBoothProjectResult;
  updateProject: (id: string, input: NewBoothProjectInput) => SaveBoothProjectResult;
  deleteProject: (id: string) => void;
  updateProjectStatus: (id: string, status: BoothStatus) => void;
};

const ProductionDataContext = createContext<ProductionDataContextValue | null>(null);

/**
 * Sumber state operasional modul Production (material gudang + proyek
 * booth), dipasang SEKALI di `src/app/dashboard/production/layout.tsx` —
 * pola yang sama dengan MagnarentDataProvider/MagnativeDataProvider.
 * Stok material tidak dikurangi permanen saat dialokasikan ke proyek —
 * "tersedia" dihitung ulang tiap render dari proyek-proyek yang masih aktif
 * (lihat src/lib/production/availability.ts), persis seperti ketersediaan
 * unit alat sewa di Magnarent. (MVP: state hanya di memori, belum
 * tersambung Supabase.)
 */
export function ProductionDataProvider({ children }: { children: ReactNode }) {
  const [materials, setMaterials] = useState<MaterialItem[]>(INITIAL_MATERIALS);
  const [projects, setProjects] = useState<BoothProject[]>(INITIAL_BOOTH_PROJECTS);

  const addMaterial = useCallback((input: Omit<MaterialItem, "id">) => {
    setMaterials((prev) => [...prev, { ...input, id: genId("mt") }]);
  }, []);

  const updateMaterial = useCallback((id: string, input: Omit<MaterialItem, "id">) => {
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...input, id } : m)));
  }, []);

  const deleteMaterial = useCallback((id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  }, []);

  /** Dipakai UI untuk memblokir hapus material yang masih dialokasikan proyek aktif. */
  const getActiveProjectsForMaterial = useCallback(
    (materialId: string) =>
      projects.filter(
        (p) =>
          ACTIVE_BOOTH_STATUSES.includes(p.status) &&
          p.materials.some((m) => m.materialId === materialId)
      ),
    [projects]
  );

  const getAvailableStockFor = useCallback(
    (materialId: string, excludeProjectId?: string) => {
      const material = materials.find((m) => m.id === materialId);
      if (!material) return 0;
      return getAvailableStock(material, projects, excludeProjectId);
    },
    [materials, projects]
  );

  const addProject = useCallback(
    (input: NewBoothProjectInput): SaveBoothProjectResult => {
      // Hanya alokasi proyek yang statusnya aktif yang benar-benar menahan
      // stok — proyek baru dengan status Selesai/Dibatalkan tidak perlu dicek.
      if (ACTIVE_BOOTH_STATUSES.includes(input.status)) {
        const conflicts = findMaterialConflicts(input.materials, materials, projects);
        if (conflicts.length > 0) {
          return { ok: false, conflicts };
        }
      }
      setProjects((prev) => [...prev, { ...input, id: genId("bp") }]);
      return { ok: true };
    },
    [materials, projects]
  );

  const updateProject = useCallback(
    (id: string, input: NewBoothProjectInput): SaveBoothProjectResult => {
      // Proyek ini sendiri dikecualikan dari perhitungan alokasinya
      // (excludeProjectId) supaya tidak "bentrok dengan dirinya sendiri".
      if (ACTIVE_BOOTH_STATUSES.includes(input.status)) {
        const conflicts = findMaterialConflicts(input.materials, materials, projects, id);
        if (conflicts.length > 0) {
          return { ok: false, conflicts };
        }
      }
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...input } : p)));
      return { ok: true };
    },
    [materials, projects]
  );

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  /**
   * Aksi cepat dari papan Jadwal (kanban) untuk memajukan tahap produksi.
   * Sengaja tidak melalui pengecekan konflik material — proyek yang sudah
   * disetujui alokasinya boleh berpindah tahap tanpa harus mengisi ulang form.
   */
  const updateProjectStatus = useCallback((id: string, status: BoothStatus) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  }, []);

  const value = useMemo<ProductionDataContextValue>(
    () => ({
      materials,
      projects,
      addMaterial,
      updateMaterial,
      deleteMaterial,
      getActiveProjectsForMaterial,
      getAvailableStockFor,
      addProject,
      updateProject,
      deleteProject,
      updateProjectStatus,
    }),
    [
      materials,
      projects,
      addMaterial,
      updateMaterial,
      deleteMaterial,
      getActiveProjectsForMaterial,
      getAvailableStockFor,
      addProject,
      updateProject,
      deleteProject,
      updateProjectStatus,
    ]
  );

  return <ProductionDataContext.Provider value={value}>{children}</ProductionDataContext.Provider>;
}

export function useProductionData(): ProductionDataContextValue {
  const ctx = useContext(ProductionDataContext);
  if (!ctx) {
    throw new Error("useProductionData harus dipakai di dalam <ProductionDataProvider>");
  }
  return ctx;
}
