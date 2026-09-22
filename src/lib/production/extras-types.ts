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

/**
 * Tahap 44 — 4 fitur tambahan tanpa bahan eksternal (lihat
 * analisis-gap-production.md): template BOM, database vendor, jam kerja
 * kru, dan lampiran gambar kerja/desain. Migrasi 0059.
 */

/** Resep alokasi material per tipe booth — `items` sama bentuknya dengan kolom `materials` di BoothProject, supaya langsung "dimuat ulang" ke form proyek tanpa transformasi. */
export type BomTemplateItem = { materialId: string; qty: number };

export type BomTemplate = {
  id: string;
  name: string;
  description: string | null;
  items: BomTemplateItem[];
  createdAt: string;
};

export type BomTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  items: BomTemplateItem[];
  created_at: string;
};

export function rowToBomTemplate(row: BomTemplateRow): BomTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    items: row.items ?? [],
    createdAt: row.created_at,
  };
}

export const VENDOR_CATEGORIES = [
  "Kayu & Panel",
  "Cat & Finishing",
  "Hardware & Rangka",
  "Elektrikal",
  "Jasa/Kontraktor",
  "Lainnya",
] as const;
export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];

export type Vendor = {
  id: string;
  name: string;
  category: VendorCategory;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  catatan: string | null;
};

export type VendorRow = {
  id: string;
  name: string;
  category: VendorCategory;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  catatan: string | null;
};

export function rowToVendor(row: VendorRow): Vendor {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    catatan: row.catatan,
  };
}

/** Jam kerja kru (internal) — banyak baris per penugasan `ProjectCrew`, dasar profitabilitas proyek versi internal (belum terhubung payroll). */
export type CrewTimelog = {
  id: string;
  projectCrewId: string;
  tanggal: string;
  jam: number;
  catatan: string | null;
};

export type CrewTimelogRow = {
  id: string;
  project_crew_id: string;
  tanggal: string;
  jam: number;
  catatan: string | null;
};

export function rowToCrewTimelog(row: CrewTimelogRow): CrewTimelog {
  return {
    id: row.id,
    projectCrewId: row.project_crew_id,
    tanggal: row.tanggal,
    jam: row.jam,
    catatan: row.catatan,
  };
}

/** Lampiran gambar kerja/desain per proyek booth (denah, rendering, shop drawing) — beda dari `ProjectPhoto` (dokumentasi before/after instalasi). */
export type ProjectDocument = {
  id: string;
  projectId: string;
  fileName: string;
  fileUrl: string;
  storagePath: string;
  fileType: string | null;
  createdAt: string;
};

export type ProjectDocumentRow = {
  id: string;
  project_id: string;
  file_name: string;
  file_url: string;
  storage_path: string;
  file_type: string | null;
  created_at: string;
};

export function rowToProjectDocument(row: ProjectDocumentRow): ProjectDocument {
  return {
    id: row.id,
    projectId: row.project_id,
    fileName: row.file_name,
    fileUrl: row.file_url,
    storagePath: row.storage_path,
    fileType: row.file_type,
    createdAt: row.created_at,
  };
}
