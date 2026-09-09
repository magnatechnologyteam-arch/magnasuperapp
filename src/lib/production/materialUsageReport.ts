import type { BoothProject, MaterialItem } from "./types";

export type MaterialReuseProjectRef = {
  projectId: string;
  projectName: string;
  qty: number;
  status: BoothProject["status"];
  date: string;
};

export type MaterialReuse = {
  material: MaterialItem;
  totalQtyUsed: number;
  /** Jumlah proyek BERBEDA yang pernah memakai material ini — inti dari "reused across projects". */
  projectCount: number;
  projects: MaterialReuseProjectRef[];
};

/**
 * Rekap pemakaian material lintas proyek booth — jawaban langsung untuk
 * permintaan investor (diteruskan owner) soal pelacakan material yang
 * dipakai ULANG di beberapa proyek berbeda (bukan cuma sekali pakai).
 *
 * Dihitung dari SELURUH riwayat proyek (termasuk yang sudah "Selesai"),
 * beda dengan `getAllocatedQty` di availability.ts yang cuma menghitung
 * alokasi proyek AKTIF untuk cek sisa stok — laporan ini soal pola
 * pemakaian dari waktu ke waktu, bukan ketersediaan stok saat ini. Proyek
 * "Dibatalkan" dikeluarkan karena bukan pemakaian nyata.
 */
export function computeMaterialReuse(materials: MaterialItem[], projects: BoothProject[]): MaterialReuse[] {
  const countedProjects = projects.filter((p) => p.status !== "Dibatalkan");

  return materials.map((material) => {
    const projectRefs: MaterialReuseProjectRef[] = countedProjects.flatMap((p) => {
      const usage = p.materials.find((m) => m.materialId === material.id);
      if (!usage || usage.qty <= 0) return [];
      return [{ projectId: p.id, projectName: p.name, qty: usage.qty, status: p.status, date: p.tanggalMulai }];
    });

    projectRefs.sort((a, b) => a.date.localeCompare(b.date));

    return {
      material,
      totalQtyUsed: projectRefs.reduce((sum, ref) => sum + ref.qty, 0),
      projectCount: projectRefs.length,
      projects: projectRefs,
    };
  });
}
