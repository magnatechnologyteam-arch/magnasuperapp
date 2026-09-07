import type { BoothProject, MaterialItem } from "./types";

/**
 * Status proyek yang masih "memegang" material dari gudang — proyek yang
 * sudah Selesai atau Dibatalkan melepaskan alokasinya, sama seperti booking
 * Selesai/Dibatalkan di Magnarent tidak lagi menahan unit alat.
 */
export const ACTIVE_BOOTH_STATUSES: BoothProject["status"][] = [
  "Desain",
  "Produksi",
  "Finishing",
  "Instalasi",
];

/** Total kuantitas satu material yang sedang dialokasikan ke proyek-proyek aktif. */
export function getAllocatedQty(
  materialId: string,
  projects: BoothProject[],
  excludeProjectId?: string
): number {
  return projects
    .filter((p) => p.id !== excludeProjectId && ACTIVE_BOOTH_STATUSES.includes(p.status))
    .reduce((sum, p) => {
      const usage = p.materials.find((m) => m.materialId === materialId);
      return sum + (usage?.qty ?? 0);
    }, 0);
}

/**
 * Stok yang masih bisa dialokasikan ke proyek baru (bisa negatif jika
 * sudah terlanjur teralokasi melebihi stok fisik).
 */
export function getAvailableStock(
  material: MaterialItem,
  projects: BoothProject[],
  excludeProjectId?: string
): number {
  return material.stock - getAllocatedQty(material.id, projects, excludeProjectId);
}

export function isLowStock(material: MaterialItem): boolean {
  return material.stock <= material.minStock;
}

export type MaterialConflict = {
  materialId: string;
  materialName: string;
  requested: number;
  available: number;
};

/**
 * Cek satu per satu baris alokasi material yang diminta sebuah proyek
 * terhadap stok yang tersisa — dipakai saat submit form BoothProjectManager,
 * paralel dengan pengecekan bentrok jadwal booking di Magnarent.
 */
export function findMaterialConflicts(
  requested: { materialId: string; qty: number }[],
  materials: MaterialItem[],
  projects: BoothProject[],
  excludeProjectId?: string
): MaterialConflict[] {
  const conflicts: MaterialConflict[] = [];
  for (const req of requested) {
    const material = materials.find((m) => m.id === req.materialId);
    if (!material) continue;
    const available = getAvailableStock(material, projects, excludeProjectId);
    if (req.qty > available) {
      conflicts.push({
        materialId: material.id,
        materialName: material.name,
        requested: req.qty,
        available,
      });
    }
  }
  return conflicts;
}
