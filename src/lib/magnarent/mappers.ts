import type { Booking, BookingStatus, InventoryItem, PaymentStatus } from "./types";

/**
 * Bentuk baris mentah dari Supabase (snake_case, sesuai kolom tabel di
 * migrasi 0004) — dipakai di dua tempat: `layout.tsx` (Server Component,
 * fetch awal) dan `actions.ts` (Server Action, setelah insert/update).
 * Dipisah dari `actions.ts` karena file itu ber-"use server" — SEMUA
 * export-nya wajib fungsi async (aturan Next.js), jadi helper mapping biasa
 * seperti ini tidak boleh ikut di sana.
 */
export type InventoryRow = {
  id: string;
  name: string;
  category: string;
  location: string;
  price_per_day: number;
  total_unit: number;
  unit_maintenance: number;
};

export type BookingRow = {
  id: string;
  item_id: string | null;
  nama_klien: string;
  telepon_klien: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string;
  jumlah_unit: number;
  status: BookingStatus;
  status_pembayaran: PaymentStatus;
  catatan: string | null;
};

export function rowToInventory(row: InventoryRow): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    location: row.location,
    pricePerDay: row.price_per_day,
    totalUnit: row.total_unit,
    unitMaintenance: row.unit_maintenance,
  };
}

export function rowToBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    // Alat yang jadi rujukan booking ini bisa saja sudah dihapus (item_id
    // null di DB, lihat komentar ON DELETE SET NULL di migrasi 0004) — UI
    // yang sudah ada (mis. `itemName` di BookingScheduler.tsx) sudah
    // menangani id yang tidak ketemu di daftar inventaris dengan fallback "—".
    itemId: row.item_id ?? "",
    namaKlien: row.nama_klien,
    teleponKlien: row.telepon_klien ?? undefined,
    tanggalMulai: row.tanggal_mulai,
    tanggalSelesai: row.tanggal_selesai,
    jumlahUnit: row.jumlah_unit,
    status: row.status,
    statusPembayaran: row.status_pembayaran,
    catatan: row.catatan ?? undefined,
  };
}
