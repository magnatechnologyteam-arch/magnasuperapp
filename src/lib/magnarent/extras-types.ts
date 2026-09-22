/**
 * Tipe & mapper untuk 3 fitur tambahan Magnarent (Tahap 28a) — checklist
 * kondisi alat, deposit/jaminan, dan log servis. Dipisah dari types.ts/
 * mappers.ts utama (bukan digabung) supaya tidak menyentuh sama sekali
 * alur booking/inventaris inti yang sudah teruji (termasuk RPC
 * `save_booking_checked` dari migrasi 0020) — 3 hal ini murni informasi
 * TAMBAHAN yang berdiri sendiri di tabel terpisah (lihat migrasi 0025).
 */

export type CheckStage = "keluar" | "kembali";

export type BookingCheck = {
  id: string;
  bookingId: string;
  stage: CheckStage;
  catatan: string | null;
  photoUrls: string[];
  checkedAt: string;
};

export type BookingCheckRow = {
  id: string;
  booking_id: string;
  stage: CheckStage;
  catatan: string | null;
  photo_urls: string[];
  photo_storage_paths: string[];
  checked_at: string;
};

export function rowToBookingCheck(row: BookingCheckRow): BookingCheck {
  return {
    id: row.id,
    bookingId: row.booking_id,
    stage: row.stage,
    catatan: row.catatan,
    photoUrls: row.photo_urls ?? [],
    checkedAt: row.checked_at,
  };
}

export const DEPOSIT_JENIS = ["Uang Tunai", "KTP", "SIM", "Lainnya"] as const;
export type DepositJenis = (typeof DEPOSIT_JENIS)[number];

export type BookingDeposit = {
  id: string;
  bookingId: string;
  jenis: DepositJenis;
  jumlah: number;
  keterangan: string | null;
  dikembalikan: boolean;
};

export type BookingDepositRow = {
  id: string;
  booking_id: string;
  jenis: DepositJenis;
  jumlah: number;
  keterangan: string | null;
  dikembalikan: boolean;
};

export function rowToBookingDeposit(row: BookingDepositRow): BookingDeposit {
  return {
    id: row.id,
    bookingId: row.booking_id,
    jenis: row.jenis,
    jumlah: row.jumlah,
    keterangan: row.keterangan,
    dikembalikan: row.dikembalikan,
  };
}

/**
 * Penjadwalan pengiriman/pengambilan alat per booking (Gap #7 analisis
 * Magnarent) — 2 tahap (pengiriman keluar, pengambilan kembali), sama pola
 * dengan BookingCheck di atas: unique(booking_id, stage) supaya bisa
 * di-upsert berulang tanpa duplikat baris. Sengaja versi ringan (belum ada
 * optimasi rute otomatis) — cukup untuk menjadwalkan sopir & jam per
 * booking, lihat migrasi 0061.
 */
export type DeliveryStage = "pengiriman" | "pengambilan";
export const DELIVERY_STATUS = ["Belum Dijadwalkan", "Dijadwalkan", "Selesai"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUS)[number];

export type Delivery = {
  id: string;
  bookingId: string;
  stage: DeliveryStage;
  driverName: string | null;
  jadwalTanggal: string | null;
  jadwalJam: string | null;
  status: DeliveryStatus;
  catatan: string | null;
};

export type DeliveryRow = {
  id: string;
  booking_id: string;
  stage: DeliveryStage;
  driver_name: string | null;
  jadwal_tanggal: string | null;
  jadwal_jam: string | null;
  status: DeliveryStatus;
  catatan: string | null;
};

export function rowToDelivery(row: DeliveryRow): Delivery {
  return {
    id: row.id,
    bookingId: row.booking_id,
    stage: row.stage,
    driverName: row.driver_name,
    jadwalTanggal: row.jadwal_tanggal,
    jadwalJam: row.jadwal_jam,
    status: row.status,
    catatan: row.catatan,
  };
}

export const MAINTENANCE_JENIS = ["Servis Rutin", "Perbaikan", "Lainnya"] as const;
export type MaintenanceJenis = (typeof MAINTENANCE_JENIS)[number];

export type MaintenanceLog = {
  id: string;
  itemId: string;
  tanggal: string;
  jenis: MaintenanceJenis;
  keterangan: string | null;
  biaya: number;
};

export type MaintenanceLogRow = {
  id: string;
  item_id: string;
  tanggal: string;
  jenis: MaintenanceJenis;
  keterangan: string | null;
  biaya: number;
};

export function rowToMaintenanceLog(row: MaintenanceLogRow): MaintenanceLog {
  return {
    id: row.id,
    itemId: row.item_id,
    tanggal: row.tanggal,
    jenis: row.jenis,
    keterangan: row.keterangan,
    biaya: row.biaya,
  };
}

/**
 * Galeri Kategori Alat — model folder/album, meniru `PortfolioFolder` di
 * `src/lib/magnative/types.ts` (migrasi 0057): satu folder = satu kategori
 * alat (mis. "Tenda & Struktur"), bisa memuat banyak foto sekaligus
 * (ditampilkan sebagai slide lewat `PhotoCarousel`), menggantikan
 * `PlaceholderGallery` statis yang tadinya nangkring di halaman Inventaris
 * (lihat migrasi magnarent_gallery_kategori_alat). `storagePath` disimpan
 * terpisah dari `photoUrl` supaya file di Supabase Storage bisa dihapus
 * lewat path-nya saat foto dihapus, tanpa perlu parsing URL publik.
 */
export type GalleryPhoto = {
  id: string;
  photoUrl: string;
  storagePath: string;
  position: number;
};

export type GalleryFolder = {
  id: string;
  title: string;
  caption?: string;
  photos: GalleryPhoto[];
  createdAt: string;
};

export type GalleryFolderRow = {
  id: string;
  title: string;
  caption: string | null;
  created_at: string;
};

export type GalleryPhotoRow = {
  id: string;
  folder_id: string;
  photo_url: string;
  storage_path: string;
  position: number;
};

function rowToGalleryPhotoOnly(row: GalleryPhotoRow): GalleryPhoto {
  return {
    id: row.id,
    photoUrl: row.photo_url,
    storagePath: row.storage_path,
    position: row.position,
  };
}

/** Folder tanpa foto dibiarkan tetap tampil dengan `photos: []` (mis. upload sempat gagal di tengah jalan) daripada disembunyikan seluruhnya. */
export function rowToGalleryFolder(folder: GalleryFolderRow, photoRows: GalleryPhotoRow[]): GalleryFolder {
  return {
    id: folder.id,
    title: folder.title,
    caption: folder.caption ?? undefined,
    createdAt: folder.created_at,
    photos: photoRows
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(rowToGalleryPhotoOnly),
  };
}
