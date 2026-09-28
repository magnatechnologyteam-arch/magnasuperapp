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

/**
 * Transfer stok material antar gudang/lokasi (Tahap 45 — gap #8
 * analisis-gap-production.md) — riwayat baca-saja, ditulis lewat RPC
 * atomik `transfer_material_stock` (migrasi 0060). Tidak ada
 * add/update/delete manual dari sini supaya jejak riwayat selalu akurat
 * (mirror pola production_purchase_orders yang statusnya diubah lewat
 * fungsi database, bukan UPDATE langsung dari app).
 */
export type MaterialTransfer = {
  id: string;
  materialId: string | null;
  materialName: string;
  qty: number;
  fromLocation: string;
  toLocation: string;
  catatan: string | null;
  createdAt: string;
};

export type MaterialTransferRow = {
  id: string;
  material_id: string | null;
  material_name: string;
  qty: number;
  from_location: string;
  to_location: string;
  catatan: string | null;
  created_at: string;
};

export function rowToMaterialTransfer(row: MaterialTransferRow): MaterialTransfer {
  return {
    id: row.id,
    materialId: row.material_id,
    materialName: row.material_name,
    qty: row.qty,
    fromLocation: row.from_location,
    toLocation: row.to_location,
    catatan: row.catatan,
    createdAt: row.created_at,
  };
}

/**
 * Upah borongan (piece-rate) kru per pekerjaan/unit-booth — analisis-kompetitor
 * #21. Terpisah dari `CrewTimelog` (jam kerja per-jam): ini mencatat
 * kesepakatan borongan (mis. "instalasi booth 3x3 unit A" @ rate x jumlah unit),
 * umum di model kerja lepas industri fabrikasi booth Indonesia. Total dihitung
 * di app layer (jumlahUnit * ratePerUnit), tersimpan langsung sebagai kolom.
 */
export const PIECE_PAYMENT_STATUS = ["Belum Dibayar", "Dibayar"] as const;
export type PiecePaymentStatus = (typeof PIECE_PAYMENT_STATUS)[number];

export type CrewPiecePayment = {
  id: string;
  projectCrewId: string;
  deskripsiPekerjaan: string;
  jumlahUnit: number;
  ratePerUnit: number;
  totalUpah: number;
  status: PiecePaymentStatus;
  tanggalBayar: string | null;
  catatan: string | null;
  createdAt: string;
};

export type CrewPiecePaymentRow = {
  id: string;
  project_crew_id: string;
  deskripsi_pekerjaan: string;
  jumlah_unit: number;
  rate_per_unit: number;
  total_upah: number;
  status: PiecePaymentStatus;
  tanggal_bayar: string | null;
  catatan: string | null;
  created_at: string;
};

export function rowToCrewPiecePayment(row: CrewPiecePaymentRow): CrewPiecePayment {
  return {
    id: row.id,
    projectCrewId: row.project_crew_id,
    deskripsiPekerjaan: row.deskripsi_pekerjaan,
    jumlahUnit: row.jumlah_unit,
    ratePerUnit: row.rate_per_unit,
    totalUpah: row.total_upah,
    status: row.status,
    tanggalBayar: row.tanggal_bayar,
    catatan: row.catatan,
    createdAt: row.created_at,
  };
}

export const NC_CATEGORIES = ["Material", "Vendor", "Kru", "Proses", "Lainnya"] as const;
export type NcCategory = (typeof NC_CATEGORIES)[number];

export const NC_SEVERITIES = ["Rendah", "Sedang", "Tinggi"] as const;
export type NcSeverity = (typeof NC_SEVERITIES)[number];

export const NC_STATUSES = ["Open", "Investigasi", "Tindakan Korektif", "Ditutup"] as const;
export type NcStatus = (typeof NC_STATUSES)[number];

/**
 * Modul NC/CAPA (non-conformance & tindakan korektif/preventif --
 * analisis-kompetitor #23) -- SENGAJA dipisah dari `ProjectCheck` di atas
 * (checklist instalasi/bongkar rutin): ini mencatat TEMUAN ketidaksesuaian
 * kualitas (material cacat, vendor telat kirim, kru lalai pasang, dsb) dan
 * tindak lanjutnya, ditautkan opsional ke proyek/vendor/kru supaya bisa
 * ditelusuri sebagai riwayat kualitas per vendor/kru (bukan cuma per
 * proyek). Murni pencatatan manual staf -- TIDAK ADA skoring/analisis
 * otomatis berbasis AI di sini.
 */
export type NcReport = {
  id: string;
  projectId: string | null;
  vendorId: string | null;
  projectCrewId: string | null;
  kategori: NcCategory;
  judul: string;
  deskripsi: string;
  severity: NcSeverity;
  status: NcStatus;
  akarMasalah: string | null;
  tindakanKorektif: string | null;
  tindakanPreventif: string | null;
  pic: string | null;
  tanggalDitemukan: string;
  tanggalDitutup: string | null;
  createdAt: string;
};

export type NcReportRow = {
  id: string;
  project_id: string | null;
  vendor_id: string | null;
  project_crew_id: string | null;
  kategori: NcCategory;
  judul: string;
  deskripsi: string;
  severity: NcSeverity;
  status: NcStatus;
  akar_masalah: string | null;
  tindakan_korektif: string | null;
  tindakan_preventif: string | null;
  pic: string | null;
  tanggal_ditemukan: string;
  tanggal_ditutup: string | null;
  created_at: string;
};

export function rowToNcReport(row: NcReportRow): NcReport {
  return {
    id: row.id,
    projectId: row.project_id,
    vendorId: row.vendor_id,
    projectCrewId: row.project_crew_id,
    kategori: row.kategori,
    judul: row.judul,
    deskripsi: row.deskripsi,
    severity: row.severity,
    status: row.status,
    akarMasalah: row.akar_masalah,
    tindakanKorektif: row.tindakan_korektif,
    tindakanPreventif: row.tindakan_preventif,
    pic: row.pic,
    tanggalDitemukan: row.tanggal_ditemukan,
    tanggalDitutup: row.tanggal_ditutup,
    createdAt: row.created_at,
  };
}

export const SUBCONTRACT_STATUSES = ["Dikirim", "Diproses", "Diterima", "Dibatalkan"] as const;
export type SubcontractStatus = (typeof SUBCONTRACT_STATUSES)[number];

export type SubcontractMaterialItem = { materialId: string; qty: number };

/**
 * Subcontracting tracking terintegrasi BOM (analisis-kompetitor #24) --
 * material yang dikirim ke vendor eksternal (laser cutting, printing
 * besar, dsb) lalu diterima kembali sebagai barang jadi. `materialDikirim`
 * berisi item BOM proyek yang sama (bukan input bebas) -- supaya benar-
 * benar "terintegrasi BOM". Tidak mengubah stok gudang, murni tracking
 * status pengiriman & penerimaan dari vendor.
 */
export type SubcontractOrder = {
  id: string;
  projectId: string;
  vendorId: string | null;
  deskripsiPekerjaan: string;
  materialDikirim: SubcontractMaterialItem[];
  status: SubcontractStatus;
  tanggalKirim: string;
  estimasiTerima: string | null;
  tanggalTerima: string | null;
  biayaJasa: number;
  catatan: string | null;
  createdAt: string;
};

export type SubcontractOrderRow = {
  id: string;
  project_id: string;
  vendor_id: string | null;
  deskripsi_pekerjaan: string;
  material_dikirim: SubcontractMaterialItem[];
  status: SubcontractStatus;
  tanggal_kirim: string;
  estimasi_terima: string | null;
  tanggal_terima: string | null;
  biaya_jasa: number;
  catatan: string | null;
  created_at: string;
};

export function rowToSubcontractOrder(row: SubcontractOrderRow): SubcontractOrder {
  return {
    id: row.id,
    projectId: row.project_id,
    vendorId: row.vendor_id,
    deskripsiPekerjaan: row.deskripsi_pekerjaan,
    materialDikirim: row.material_dikirim ?? [],
    status: row.status,
    tanggalKirim: row.tanggal_kirim,
    estimasiTerima: row.estimasi_terima,
    tanggalTerima: row.tanggal_terima,
    biayaJasa: row.biaya_jasa,
    catatan: row.catatan,
    createdAt: row.created_at,
  };
}
