"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";
import {
  rowToBookingCheck,
  rowToBookingDeposit,
  rowToMaintenanceLog,
  type BookingCheck,
  type BookingCheckRow,
  type BookingDeposit,
  type BookingDepositRow,
  type CheckStage,
  type DepositJenis,
  type MaintenanceJenis,
  type MaintenanceLog,
  type MaintenanceLogRow,
} from "./extras-types";

const MODULE_PATH = "/dashboard/magnarent/booking";
const INVENTORY_PATH = "/dashboard/magnarent/inventaris";
const GENERIC_ERROR = "Terjadi kesalahan, coba lagi.";
const CHECKS_BUCKET = "magnarent-checks";

export type MutationResult = { ok: true } | { ok: false; error: string };

/**
 * Checklist kondisi alat (Tahap 28a) — satu baris per (booking, stage),
 * di-upsert lewat unique(booking_id, stage) di migrasi 0025 supaya staf
 * bisa perbarui catatan/foto yang sama tanpa bikin duplikat baris.
 */
export async function getBookingChecks(bookingId: string): Promise<BookingCheck[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("magnarent_booking_checks")
    .select("*")
    .eq("booking_id", bookingId)
    .returns<BookingCheckRow[]>();

  if (error) {
    console.error("[magnarent] getBookingChecks gagal:", error.message);
    return [];
  }
  return (data ?? []).map(rowToBookingCheck);
}

export async function saveBookingCheck(
  bookingId: string,
  stage: CheckStage,
  catatan: string,
  formData: FormData
): Promise<MutationResult> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("magnarent_booking_checks")
    .select("photo_urls, photo_storage_paths")
    .eq("booking_id", bookingId)
    .eq("stage", stage)
    .maybeSingle();

  const photoUrls: string[] = existing?.photo_urls ?? [];
  const photoPaths: string[] = existing?.photo_storage_paths ?? [];

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "jpg";
    const storagePath = `${bookingId}/${stage}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(CHECKS_BUCKET)
      .upload(storagePath, file, { contentType: file.type || undefined });
    if (uploadError) {
      console.error("[magnarent] Upload foto checklist gagal:", uploadError.message);
      continue;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from(CHECKS_BUCKET).getPublicUrl(storagePath);
    photoUrls.push(publicUrl);
    photoPaths.push(storagePath);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("magnarent_booking_checks").upsert(
    {
      booking_id: bookingId,
      stage,
      catatan: catatan.trim() || null,
      photo_urls: photoUrls,
      photo_storage_paths: photoPaths,
      checked_by: user?.id ?? null,
      checked_at: new Date().toISOString(),
    },
    { onConflict: "booking_id,stage" }
  );

  if (error) {
    console.error("[magnarent] saveBookingCheck gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  return { ok: true };
}

export async function removeBookingCheckPhoto(
  bookingId: string,
  stage: CheckStage,
  photoUrl: string
): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("magnarent_booking_checks")
    .select("photo_urls, photo_storage_paths")
    .eq("booking_id", bookingId)
    .eq("stage", stage)
    .maybeSingle();

  if (fetchError || !existing) return { ok: false, error: GENERIC_ERROR };

  const urls: string[] = existing.photo_urls ?? [];
  const paths: string[] = existing.photo_storage_paths ?? [];
  const idx = urls.indexOf(photoUrl);
  if (idx === -1) return { ok: true };

  const removedPath = paths[idx];
  urls.splice(idx, 1);
  paths.splice(idx, 1);

  const { error } = await supabase
    .from("magnarent_booking_checks")
    .update({ photo_urls: urls, photo_storage_paths: paths })
    .eq("booking_id", bookingId)
    .eq("stage", stage);

  if (error) {
    console.error("[magnarent] removeBookingCheckPhoto gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  if (removedPath) await supabase.storage.from(CHECKS_BUCKET).remove([removedPath]);
  revalidatePath(MODULE_PATH);
  return { ok: true };
}

/**
 * Deposit/jaminan booking — satu baris per booking (unique booking_id di
 * migrasi 0025), di-upsert supaya form "Jaminan" bisa dipakai berulang
 * untuk menambah/mengubah tanpa perlu tombol tambah/edit terpisah.
 */
export async function getBookingDeposit(bookingId: string): Promise<BookingDeposit | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("magnarent_booking_deposits")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle<BookingDepositRow>();

  if (error || !data) return null;
  return rowToBookingDeposit(data);
}

export async function saveBookingDeposit(
  bookingId: string,
  input: { jenis: DepositJenis; jumlah: number; keterangan?: string }
): Promise<MutationResult> {
  if (!Number.isFinite(input.jumlah) || input.jumlah < 0) {
    return { ok: false, error: "Jumlah jaminan tidak valid." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("magnarent_booking_deposits").upsert(
    {
      booking_id: bookingId,
      jenis: input.jenis,
      jumlah: input.jumlah,
      keterangan: input.keterangan?.trim() || null,
    },
    { onConflict: "booking_id" }
  );

  if (error) {
    console.error("[magnarent] saveBookingDeposit gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  return { ok: true };
}

export async function setDepositReturned(bookingId: string, returned: boolean): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("magnarent_booking_deposits")
    .update({ dikembalikan: returned, dikembalikan_at: returned ? new Date().toISOString() : null })
    .eq("booking_id", bookingId);

  if (error) {
    console.error("[magnarent] setDepositReturned gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  return { ok: true };
}

/**
 * Log riwayat servis/perbaikan alat — banyak baris per alat (murni riwayat,
 * tidak di-upsert), dibuka dari InventoryManager.tsx.
 */
export async function getMaintenanceLogs(itemId: string): Promise<MaintenanceLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("magnarent_maintenance_logs")
    .select("*")
    .eq("item_id", itemId)
    .order("tanggal", { ascending: false })
    .returns<MaintenanceLogRow[]>();

  if (error) {
    console.error("[magnarent] getMaintenanceLogs gagal:", error.message);
    return [];
  }
  return (data ?? []).map(rowToMaintenanceLog);
}

export async function addMaintenanceLog(
  itemId: string,
  input: { tanggal: string; jenis: MaintenanceJenis; keterangan?: string; biaya: number }
): Promise<MutationResult> {
  if (!input.tanggal) return { ok: false, error: "Tanggal wajib diisi." };
  if (!Number.isFinite(input.biaya) || input.biaya < 0) {
    return { ok: false, error: "Biaya tidak valid." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("magnarent_maintenance_logs").insert({
    item_id: itemId,
    tanggal: input.tanggal,
    jenis: input.jenis,
    keterangan: input.keterangan?.trim() || null,
    biaya: input.biaya,
    created_by: user?.id ?? null,
  });

  if (error) {
    console.error("[magnarent] addMaintenanceLog gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(INVENTORY_PATH);
  void logActivity({ module: "magnarent", action: "create", entityType: "servis alat", entityLabel: input.jenis });
  return { ok: true };
}

export async function deleteMaintenanceLog(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("magnarent_maintenance_logs").delete().eq("id", id);
  if (error) {
    console.error("[magnarent] deleteMaintenanceLog gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(INVENTORY_PATH);
  return { ok: true };
}
