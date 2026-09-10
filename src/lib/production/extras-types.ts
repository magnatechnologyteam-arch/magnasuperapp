/**
 * Tipe & mapper untuk 4 fitur tambahan Production (Tahap 28c) — checklist
 * instalasi/bongkar + foto, penugasan kru, galeri dokumentasi before/after,
 * dan alat berat/perkakas + riwayat pemakaian. Dipisah dari types.ts/
 * mappers.ts utama (bukan digabung) supaya tidak menyentuh sama sekali alur
 * proyek booth/material inti yang sudah teruji (termasuk RPC
 * `save_booth_project_checked` dari migrasi 0020) — semua ini murni
 * informasi TAMBAHAN yang berdiri sendiri di tabel terpisah (lihat migrasi
 * 0027). Pola persis sama dengan `src/lib/magnarent/extras-types.ts`.
 */

export type CheckStage = "instalasi" | "bongkar";

export type ProjectCheck = {
  id: string;
  projectId: string;
  stage: CheckStage;
  catatan: string | null;
  photoUrls: string[];
  checkedAt: string;
};

export type ProjectCheckRow = {
  id: string;
  project_id: string;
  stage: CheckStage;
  catatan: string | null;
  photo_urls: string[];
  photo_storage_paths: string[];
  checked_at: string;
};

export function rowToProjectCheck(row: ProjectCheckRow): ProjectCheck {
  return {
    id: row.id,
    projectId: row.project_id,
    stage: row.stage,
    catatan: row.catatan,
    photoUrls: row.photo_urls ?? [],
    checkedAt: row.checked_at,
  };
}

/** Kru SENGAJA nama bebas (bukan menautkan ke `profiles`) — lihat komentar migrasi 0027. */
export const CREW_ROLES = [
  "Koordinator Lapangan",
  "Tukang/Instalatur",
  "Desainer",
  "Sopir/Logistik",
  "Lainnya",
] as const;
export type CrewRole = (typeof CREW_ROLES)[number];

export type ProjectCrew = {
  id: string;
  projectId: string;
  nama: string;
  peran: CrewRole;
  kontak: string | null;
  catatan: string | null;
};

export type ProjectCrewRow = {
  id: string;
  project_id: string;
  nama: string;
  peran: CrewRole;
  kontak: string | null;
  catatan: string | null;
};

export function rowToProjectCrew(row: ProjectCrewRow): ProjectCrew {
  return {
    id: row.id,
    projectId: row.project_id,
    nama: row.nama,
    peran: row.peran,
    kontak: row.kontak,
    catatan: row.catatan,
  };
}

export const DOCUMENTATION_TAHAP = ["Sebelum", "Sesudah"] as const;
export type DocumentationTahap = (typeof DOCUMENTATION_TAHAP)[number];

export type ProjectPhoto = {
  id: string;
  projectId: string;
  tahap: DocumentationTahap;
  photoUrl: string;
  caption: string | null;
  createdAt: string;
};

export type ProjectPhotoRow = {
  id: string;
  project_id: string;
  tahap: DocumentationTahap;
  photo_url: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
};

export function rowToProjectPhoto(row: ProjectPhotoRow): ProjectPhoto {
  return {
    id: row.id,
    projectId: row.project_id,
    tahap: row.tahap,
    photoUrl: row.photo_url,
    caption: row.caption,
    createdAt: row.created_at,
  };
}

export const EQUIPMENT_CATEGORIES = ["Alat Berat", "Perkakas Listrik", "Perkakas Manual", "Lainnya"] as const;
export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];

export const EQUIPMENT_CONDITIONS = ["Baik", "Perlu Servis", "Rusak"] as const;
export type EquipmentCondition = (typeof EQUIPMENT_CONDITIONS)[number];

export type Equipment = {
  id: string;
  name: string;
  kategori: EquipmentCategory;
  kondisi: EquipmentCondition;
  catatan: string | null;
};

export type EquipmentRow = {
  id: string;
  name: string;
  kategori: EquipmentCategory;
  kondisi: EquipmentCondition;
  catatan: string | null;
};

export function rowToEquipment(row: EquipmentRow): Equipment {
  return {
    id: row.id,
    name: row.name,
    kategori: row.kategori,
    kondisi: row.kondisi,
    catatan: row.catatan,
  };
}

export type EquipmentUsage = {
  id: string;
  equipmentId: string;
  projectId: string | null;
  digunakanOleh: string;
  tanggalPinjam: string;
  tanggalKembali: string | null;
  catatan: string | null;
};

export type EquipmentUsageRow = {
  id: string;
  equipment_id: string;
  project_id: string | null;
  digunakan_oleh: string;
  tanggal_pinjam: string;
  tanggal_kembali: string | null;
  catatan: string | null;
};

export function rowToEquipmentUsage(row: EquipmentUsageRow): EquipmentUsage {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    projectId: row.project_id,
    digunakanOleh: row.digunakan_oleh,
    tanggalPinjam: row.tanggal_pinjam,
    tanggalKembali: row.tanggal_kembali,
    catatan: row.catatan,
  };
}
