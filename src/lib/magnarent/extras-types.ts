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
