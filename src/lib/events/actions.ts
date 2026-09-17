"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";
import type { CreateEventTypeInput, TemplateImportRow, TemplateImportSummary, TemplateItemInput } from "./types";

const MODULE_PATH = "/dashboard/admin/jenis-event";
const GENERIC_ERROR = "Terjadi kesalahan, coba lagi.";

export type MutationResult = { ok: true } | { ok: false; error: string };

/**
 * Tambah jenis event baru (Tahap B) -- daftar TERBUKA, Admin (division
 * "all") bisa terus menambah jenis baru kapan saja (mis. muncul jenis event
 * baru yang belum pernah ada template-nya), bukan daftar tertutup yang
 * dikunci dari awal.
 */
export async function createEventType(input: CreateEventTypeInput): Promise<MutationResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Nama jenis event wajib diisi." };

  const supabase = await createClient();
  const { error } = await supabase.from("event_types").insert({
    name,
    description: input.description?.trim() || null,
  });

  if (error) {
    console.error("[events] createEventType gagal:", error.message);
    if (error.code === "23505") {
      return { ok: false, error: `Jenis event "${name}" sudah ada.` };
    }
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  void logActivity({ module: "admin", action: "create", entityType: "jenis event", entityLabel: name });
  return { ok: true };
}

export async function updateEventType(id: string, input: CreateEventTypeInput): Promise<MutationResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Nama jenis event wajib diisi." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("event_types")
    .update({ name, description: input.description?.trim() || null })
    .eq("id", id);

  if (error) {
    console.error("[events] updateEventType gagal:", error.message);
    if (error.code === "23505") {
      return { ok: false, error: `Jenis event "${name}" sudah ada.` };
    }
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  void logActivity({ module: "admin", action: "update", entityType: "jenis event", entityLabel: name });
  return { ok: true };
}

/** Nonaktifkan/aktifkan jenis event -- SENGAJA tidak ada hapus permanen:
 * jenis event yang sudah pernah dipakai bisa saja masih dirujuk oleh event
 * lama (`events.event_type_id`, on delete set null kalau tetap dihapus,
 * tapi itu akan memutus riwayat jenis event-nya secara diam-diam). Sama
 * seperti pola `setAccountActive` di modul Akuntansi. */
export async function setEventTypeActive(id: string, isActive: boolean): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("event_types")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) return { ok: false, error: "Jenis event tidak ditemukan." };

  const { error } = await supabase.from("event_types").update({ is_active: isActive }).eq("id", id);
  if (error) {
    console.error("[events] setEventTypeActive gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  void logActivity({
    module: "admin",
    action: "update",
    entityType: "jenis event",
    entityLabel: `${existing.name} (${isActive ? "diaktifkan" : "dinonaktifkan"})`,
  });
  return { ok: true };
}

export async function addTemplateItem(eventTypeId: string, input: TemplateItemInput, sortOrder: number): Promise<MutationResult> {
  const category = input.category.trim();
  const itemName = input.itemName.trim();
  if (!category) return { ok: false, error: "Kategori wajib diisi." };
  if (!itemName) return { ok: false, error: "Nama item wajib diisi." };

  const supabase = await createClient();
  const { error } = await supabase.from("event_type_template_items").insert({
    event_type_id: eventTypeId,
    category,
    item_name: itemName,
    detail: input.detail?.trim() || null,
    qty_info: input.qtyInfo?.trim() || null,
    notes: input.notes?.trim() || null,
    sort_order: sortOrder,
  });

  if (error) {
    console.error("[events] addTemplateItem gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  return { ok: true };
}

export async function updateTemplateItem(id: string, input: TemplateItemInput): Promise<MutationResult> {
  const category = input.category.trim();
  const itemName = input.itemName.trim();
  if (!category) return { ok: false, error: "Kategori wajib diisi." };
  if (!itemName) return { ok: false, error: "Nama item wajib diisi." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("event_type_template_items")
    .update({
      category,
      item_name: itemName,
      detail: input.detail?.trim() || null,
      qty_info: input.qtyInfo?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .eq("id", id);

  if (error) {
    console.error("[events] updateTemplateItem gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  return { ok: true };
}

export async function deleteTemplateItem(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("event_type_template_items").delete().eq("id", id);
  if (error) {
    console.error("[events] deleteTemplateItem gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  return { ok: true };
}

export type BulkImportResult = { ok: true; summary: TemplateImportSummary } | { ok: false; error: string };

/**
 * Import massal template checklist dari Excel/CSV (Tahap B) -- file
 * di-parse di BROWSER (lihat EventTypeManager.tsx, pakai library `xlsx`,
 * pola sama seperti ProductManager.tsx) supaya Server Action ini cukup
 * menerima array data biasa.
 *
 * `mode: "replace"` menghapus SEMUA template item jenis event ini dulu
 * sebelum menyisipkan hasil import -- ini pilihan DEFAULT di UI karena
 * kasus paling umum adalah "koreksi file lalu import ulang", bukan
 * menumpuk baris duplikat. `mode: "append"` menambahkan tanpa menghapus,
 * untuk kasus menggabungkan beberapa file sumber.
 */
export async function bulkImportTemplateItems(
  eventTypeId: string,
  rows: TemplateImportRow[],
  mode: "replace" | "append"
): Promise<BulkImportResult> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: "Tidak ada baris data untuk diimpor." };
  }

  const supabase = await createClient();

  const { data: eventType, error: eventTypeError } = await supabase
    .from("event_types")
    .select("name")
    .eq("id", eventTypeId)
    .maybeSingle();
  if (eventTypeError || !eventType) {
    return { ok: false, error: "Jenis event tidak ditemukan." };
  }

  if (mode === "replace") {
    const { error: deleteError } = await supabase
      .from("event_type_template_items")
      .delete()
      .eq("event_type_id", eventTypeId);
    if (deleteError) {
      console.error("[events] bulkImportTemplateItems: gagal hapus item lama:", deleteError.message);
      return { ok: false, error: GENERIC_ERROR };
    }
  }

  const summary: TemplateImportSummary = { inserted: 0, skipped: 0, errors: [] };
  const toInsert: {
    event_type_id: string;
    category: string;
    item_name: string;
    detail: string | null;
    qty_info: string | null;
    notes: string | null;
    sort_order: number;
  }[] = [];

  rows.forEach((row, index) => {
    const category = row.category?.trim();
    const itemName = row.itemName?.trim();
    if (!category || !itemName) {
      summary.skipped++;
      summary.errors.push(`Baris ${index + 1}: kategori atau nama item kosong, dilewati.`);
      return;
    }
    toInsert.push({
      event_type_id: eventTypeId,
      category,
      item_name: itemName,
      detail: row.detail?.trim() || null,
      qty_info: row.qtyInfo?.trim() || null,
      notes: row.notes?.trim() || null,
      sort_order: index * 10,
    });
  });

  if (toInsert.length === 0) {
    return { ok: false, error: "Semua baris tidak valid (kategori/nama item kosong)." };
  }

  const { error: insertError } = await supabase.from("event_type_template_items").insert(toInsert);
  if (insertError) {
    console.error("[events] bulkImportTemplateItems: gagal simpan:", insertError.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  summary.inserted = toInsert.length;

  revalidatePath(MODULE_PATH);
  void logActivity({
    module: "admin",
    action: "create",
    entityType: "template checklist event",
    entityLabel: `${eventType.name} (${summary.inserted} item diimpor)`,
  });
  return { ok: true, summary };
}
