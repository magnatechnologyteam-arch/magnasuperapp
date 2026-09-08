"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAvailableUnitsInRange, getOverlappingBookings } from "./availability";
import { rowToBooking, rowToInventory, type BookingRow, type InventoryRow } from "./mappers";
import type { Booking, BookingStatus, InventoryItem, PaymentStatus } from "./types";

const MODULE_PATH = "/dashboard/magnarent";
const GENERIC_ERROR = "Terjadi kesalahan, coba lagi.";

export type MutationResult = { ok: true } | { ok: false; error: string };

export type BookingConflict = { overlapping: Booking[]; available: number; requested: number };
export type SaveBookingResult =
  | { ok: true }
  | { ok: false; conflict: BookingConflict }
  | { ok: false; error: string };

export type BookingInput = {
  itemId: string;
  namaKlien: string;
  teleponKlien?: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  jumlahUnit: number;
  statusPembayaran: PaymentStatus;
  catatan?: string;
};

/**
 * Semua Server Action di sini menulis ke Supabase lalu `revalidatePath` —
 * itu otomatis membuat Next.js mengambil ulang data di
 * `src/app/dashboard/magnarent/layout.tsx` (Server Component) dan mengirim
 * props baru ke `MagnarentDataProvider`, jadi UI ter-update tanpa reload
 * manual meski action ini dipanggil langsung sebagai fungsi (bukan lewat
 * atribut `<form action>`).
 *
 * Setiap tabel sudah dijaga RLS (lihat migrasi 0004: `can_access_division`),
 * jadi pengecekan divisi tidak perlu diulang di sini — kalau akun yang
 * memanggil bukan divisi Magnarent/akses penuh, query-nya otomatis kena
 * kosong/ditolak oleh Postgres, bukan cuma disembunyikan di UI.
 */
export async function addInventoryItem(input: Omit<InventoryItem, "id">): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("magnarent_inventory").insert({
    name: input.name,
    category: input.category,
    location: input.location,
    price_per_day: input.pricePerDay,
    total_unit: input.totalUnit,
    unit_maintenance: input.unitMaintenance,
  });

  if (error) {
    console.error("[magnarent] addInventoryItem gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  return { ok: true };
}

export async function updateInventoryItem(
  id: string,
  input: Omit<InventoryItem, "id">
): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("magnarent_inventory")
    .update({
      name: input.name,
      category: input.category,
      location: input.location,
      price_per_day: input.pricePerDay,
      total_unit: input.totalUnit,
      unit_maintenance: input.unitMaintenance,
    })
    .eq("id", id);

  if (error) {
    console.error("[magnarent] updateInventoryItem gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  return { ok: true };
}

export async function deleteInventoryItem(id: string): Promise<MutationResult> {
  const supabase = await createClient();

  // Cegah hapus alat yang masih dipegang booking AKTIF — dulu ini cuma
  // dicek di UI (getActiveBookingsForItem); ditegakkan ulang di sini supaya
  // tidak bisa dilewati dengan memanggil action ini langsung.
  const { data: activeRows, error: activeError } = await supabase
    .from("magnarent_bookings")
    .select("id")
    .eq("item_id", id)
    .in("status", ["Menunggu", "Dikonfirmasi"])
    .limit(1);

  if (activeError) {
    console.error("[magnarent] Cek booking aktif sebelum hapus alat gagal:", activeError.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  if (activeRows && activeRows.length > 0) {
    return { ok: false, error: "Alat masih dipakai booking aktif, tidak bisa dihapus." };
  }

  const { error } = await supabase.from("magnarent_inventory").delete().eq("id", id);
  if (error) {
    console.error("[magnarent] deleteInventoryItem gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  return { ok: true };
}

type Capacity = { item: InventoryItem; overlapping: Booking[]; available: number };

/** Ambil data terkini dari DB lalu pakai ulang logika bentrok yang sama persis dengan versi lama (src/lib/magnarent/availability.ts) — supaya aturan bisnisnya tidak berubah, cuma sumber datanya yang sekarang Supabase, bukan React state. */
async function checkBookingCapacity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: BookingInput,
  excludeId?: string
): Promise<Capacity | { error: string }> {
  const { data: itemRow, error: itemError } = await supabase
    .from("magnarent_inventory")
    .select("*")
    .eq("id", input.itemId)
    .maybeSingle<InventoryRow>();

  if (itemError) {
    console.error("[magnarent] Ambil data alat gagal:", itemError.message);
    return { error: GENERIC_ERROR };
  }
  if (!itemRow) {
    return { error: "Alat tidak ditemukan." };
  }

  const { data: bookingRows, error: bookingsError } = await supabase
    .from("magnarent_bookings")
    .select("*")
    .eq("item_id", input.itemId)
    .returns<BookingRow[]>();

  if (bookingsError) {
    console.error("[magnarent] Ambil data booking gagal:", bookingsError.message);
    return { error: GENERIC_ERROR };
  }

  const item = rowToInventory(itemRow);
  const bookings = (bookingRows ?? []).map(rowToBooking);
  const overlapping = getOverlappingBookings(
    bookings,
    input.itemId,
    input.tanggalMulai,
    input.tanggalSelesai,
    excludeId
  );
  const available = getAvailableUnitsInRange(
    item,
    bookings,
    input.tanggalMulai,
    input.tanggalSelesai,
    excludeId
  );

  return { item, overlapping, available };
}

export async function addBooking(input: BookingInput): Promise<SaveBookingResult> {
  const supabase = await createClient();
  const capacity = await checkBookingCapacity(supabase, input);
  if ("error" in capacity) return { ok: false, error: capacity.error };

  if (input.jumlahUnit > capacity.available) {
    return {
      ok: false,
      conflict: { overlapping: capacity.overlapping, available: capacity.available, requested: input.jumlahUnit },
    };
  }

  const { error } = await supabase.from("magnarent_bookings").insert({
    item_id: input.itemId,
    nama_klien: input.namaKlien,
    telepon_klien: input.teleponKlien ?? null,
    tanggal_mulai: input.tanggalMulai,
    tanggal_selesai: input.tanggalSelesai,
    jumlah_unit: input.jumlahUnit,
    status: "Menunggu",
    status_pembayaran: input.statusPembayaran,
    catatan: input.catatan ?? null,
  });

  if (error) {
    console.error("[magnarent] addBooking gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  return { ok: true };
}

export async function updateBooking(id: string, input: BookingInput): Promise<SaveBookingResult> {
  const supabase = await createClient();
  const capacity = await checkBookingCapacity(supabase, input, id);
  if ("error" in capacity) return { ok: false, error: capacity.error };

  if (input.jumlahUnit > capacity.available) {
    return {
      ok: false,
      conflict: { overlapping: capacity.overlapping, available: capacity.available, requested: input.jumlahUnit },
    };
  }

  const { error } = await supabase
    .from("magnarent_bookings")
    .update({
      item_id: input.itemId,
      nama_klien: input.namaKlien,
      telepon_klien: input.teleponKlien ?? null,
      tanggal_mulai: input.tanggalMulai,
      tanggal_selesai: input.tanggalSelesai,
      jumlah_unit: input.jumlahUnit,
      status_pembayaran: input.statusPembayaran,
      catatan: input.catatan ?? null,
    })
    .eq("id", id);

  if (error) {
    console.error("[magnarent] updateBooking gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  return { ok: true };
}

export async function deleteBooking(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("magnarent_bookings").delete().eq("id", id);
  if (error) {
    console.error("[magnarent] deleteBooking gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  return { ok: true };
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("magnarent_bookings").update({ status }).eq("id", id);
  if (error) {
    console.error("[magnarent] updateBookingStatus gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  return { ok: true };
}
