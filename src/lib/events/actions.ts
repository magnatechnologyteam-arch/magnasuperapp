"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";
import { notifyDivision } from "@/lib/push/notify";
import type {
  CreateEventInput,
  CreateEventTypeInput,
  EventSourceType,
  EventStatus,
  LinkableSource,
  TemplateImportRow,
  TemplateImportSummary,
  TemplateItemInput,
  UpdateChecklistProgressInput,
} from "./types";

const MODULE_PATH = "/dashboard/admin/jenis-event";
const EVENTS_PATH = "/dashboard/admin/events";
/** Papan Tracking (Tahap D) -- halaman terpisah dari EVENTS_PATH di atas,
 * dibuka untuk 3 divisi operasional + akses penuh (lihat page.tsx-nya). */
const TRACKING_PATH = "/dashboard/tracking-event";
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

/**
 * Hapus jenis event PERMANEN -- HANYA diizinkan kalau belum ada satu pun
 * event yang memakai jenis ini (`events.event_type_id`). Kalau sudah
 * pernah dipakai, tolak dan arahkan ke nonaktifkan (`setEventTypeActive`)
 * saja -- lihat komentar di fungsi itu kenapa hapus paksa berbahaya untuk
 * riwayat event lama. Template checklist-nya (`event_type_template_items`)
 * ikut terhapus otomatis lewat ON DELETE CASCADE kalau memang lolos cek.
 */
export async function deleteEventType(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("event_types")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) return { ok: false, error: "Jenis event tidak ditemukan." };

  const { count, error: countError } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("event_type_id", id);

  if (countError) {
    console.error("[events] deleteEventType: gagal cek pemakaian:", countError.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `Jenis event "${existing.name}" sudah dipakai ${count} event. Tidak bisa dihapus permanen -- nonaktifkan saja supaya tidak muncul lagi di pilihan baru.`,
    };
  }

  const { error } = await supabase.from("event_types").delete().eq("id", id);
  if (error) {
    console.error("[events] deleteEventType gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  void logActivity({ module: "admin", action: "delete", entityType: "jenis event", entityLabel: existing.name });
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

// ---------------------------------------------------------------------
// Tahap C: event AKTUAL -- lihat komentar di types.ts.
// ---------------------------------------------------------------------

export type CreateEventResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Bikin event baru (titik "Event In" di diagram Owner) -- SENGAJA cuma
 * akses penuh yang bisa (RLS `events_insert`), staf 3 divisi operasional
 * baru terlibat lewat checklist & kaitan sesudahnya. Kalau `eventTypeId`
 * diisi, template checklist jenis itu langsung di-clone jadi checklist
 * AKTUAL event ini -- kalau kosong, checklist dimulai kosong (diisi
 * manual/import lewat halaman detail).
 *
 * Notifikasi ke 3 divisi operasional dikirim SETELAH event (+ clone
 * checklist) berhasil tersimpan -- best-effort, gagal kirim tidak
 * membatalkan event yang sudah dibuat (lihat komentar `notifyDivision`).
 */
export async function createEvent(input: CreateEventInput): Promise<CreateEventResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Nama event wajib diisi." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      name,
      client_name: input.clientName?.trim() || null,
      event_type_id: input.eventTypeId || null,
      location: input.location?.trim() || null,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      notes: input.notes?.trim() || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !event) {
    console.error("[events] createEvent gagal:", error?.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  if (input.eventTypeId) {
    const { data: templateItems, error: templateError } = await supabase
      .from("event_type_template_items")
      .select("category, item_name, detail, qty_info, notes, sort_order")
      .eq("event_type_id", input.eventTypeId)
      .order("sort_order", { ascending: true });

    if (templateError) {
      console.error("[events] createEvent: gagal ambil template:", templateError.message);
    } else if (templateItems && templateItems.length > 0) {
      const { error: cloneError } = await supabase.from("event_checklist_items").insert(
        templateItems.map((t) => ({
          event_id: event.id,
          category: t.category,
          item_name: t.item_name,
          detail: t.detail,
          qty_info: t.qty_info,
          notes: t.notes,
          sort_order: t.sort_order,
        }))
      );
      if (cloneError) {
        console.error("[events] createEvent: gagal clone template:", cloneError.message);
      }
    }
  }

  revalidatePath(EVENTS_PATH);
  void logActivity({ module: "admin", action: "create", entityType: "event", entityLabel: name });
  void notifyDivision(
    ["magnarent", "magnative", "production"],
    {
      title: "Event Baru",
      body: `${name}${input.clientName ? ` — ${input.clientName.trim()}` : ""} baru dibuat. Cek checklist & kaitkan booking/proyek yang relevan.`,
      // Event baru sengaja ditandai "penting" (migrasi 0062) -- muncul
      // sebagai banner mencolok di AppShell (ImportantNotificationBanner)
      // dan push notification yang tidak hilang sendiri (lihat public/sw.js),
      // beda dari notifikasi rutin lain seperti booking/stok menipis.
      important: true,
    },
    user?.id
  );

  return { ok: true, id: event.id };
}

export async function updateEventStatus(id: string, status: EventStatus): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("events").select("name").eq("id", id).maybeSingle();
  if (!existing) return { ok: false, error: "Event tidak ditemukan." };

  const { error } = await supabase.from("events").update({ status }).eq("id", id);
  if (error) {
    console.error("[events] updateEventStatus gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(EVENTS_PATH);
  revalidatePath(`${EVENTS_PATH}/${id}`);
  void logActivity({
    module: "admin",
    action: "update",
    entityType: "event",
    entityLabel: `${existing.name} (status → ${status})`,
  });
  return { ok: true };
}

/**
 * Hapus event PERMANEN -- beda dari `updateEventStatus(id, "Dibatalkan")`
 * yang cuma mengubah status (dipakai kalau event batal tapi datanya tetap
 * mau disimpan sebagai riwayat). Ini untuk kasus event salah input/dibuat
 * coba-coba yang belum ada progres nyata.
 *
 * Checklist (`event_checklist_items`) dan kaitan booking/proyek
 * (`event_links`) ikut terhapus otomatis lewat ON DELETE CASCADE. TAPI
 * kalau salah satu booking/proyek yang dikaitkan ke event ini SUDAH punya
 * pengeluaran Realisasi Event tercatat (`event_expenses`, yang juga sudah
 * kepost ke jurnal akuntansi), hapus permanen DITOLAK -- supaya jejak
 * "pengeluaran ini untuk event apa" tidak hilang diam-diam. Untuk kasus
 * itu pakai ubah status ke "Dibatalkan" saja.
 */
export async function deleteEvent(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("events")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) return { ok: false, error: "Event tidak ditemukan." };

  const { data: links, error: linksError } = await supabase
    .from("event_links")
    .select("source_type, source_id")
    .eq("event_id", id);

  if (linksError) {
    console.error("[events] deleteEvent: gagal cek kaitan:", linksError.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  for (const link of links ?? []) {
    const { count, error: expenseError } = await supabase
      .from("event_expenses")
      .select("id", { count: "exact", head: true })
      .eq("source_type", link.source_type)
      .eq("source_id", link.source_id);

    if (expenseError) {
      console.error("[events] deleteEvent: gagal cek pengeluaran:", expenseError.message);
      return { ok: false, error: GENERIC_ERROR };
    }
    if ((count ?? 0) > 0) {
      return {
        ok: false,
        error:
          'Event ini sudah punya pengeluaran Realisasi Event yang tercatat (sudah masuk jurnal akuntansi). Tidak bisa dihapus permanen -- pakai ubah status ke "Dibatalkan" saja supaya riwayatnya tetap ada.',
      };
    }
  }

  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) {
    console.error("[events] deleteEvent gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(EVENTS_PATH);
  void logActivity({ module: "admin", action: "delete", entityType: "event", entityLabel: existing.name });
  return { ok: true };
}

export async function addEventChecklistItem(
  eventId: string,
  input: TemplateItemInput,
  sortOrder: number
): Promise<MutationResult> {
  const category = input.category.trim();
  const itemName = input.itemName.trim();
  if (!category) return { ok: false, error: "Kategori wajib diisi." };
  if (!itemName) return { ok: false, error: "Nama item wajib diisi." };

  const supabase = await createClient();
  const { error } = await supabase.from("event_checklist_items").insert({
    event_id: eventId,
    category,
    item_name: itemName,
    detail: input.detail?.trim() || null,
    qty_info: input.qtyInfo?.trim() || null,
    notes: input.notes?.trim() || null,
    sort_order: sortOrder,
  });

  if (error) {
    console.error("[events] addEventChecklistItem gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(`${EVENTS_PATH}/${eventId}`);
  return { ok: true };
}

export async function updateEventChecklistItem(
  id: string,
  eventId: string,
  input: TemplateItemInput
): Promise<MutationResult> {
  const category = input.category.trim();
  const itemName = input.itemName.trim();
  if (!category) return { ok: false, error: "Kategori wajib diisi." };
  if (!itemName) return { ok: false, error: "Nama item wajib diisi." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("event_checklist_items")
    .update({
      category,
      item_name: itemName,
      detail: input.detail?.trim() || null,
      qty_info: input.qtyInfo?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .eq("id", id);

  if (error) {
    console.error("[events] updateEventChecklistItem gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(`${EVENTS_PATH}/${eventId}`);
  return { ok: true };
}

/**
 * Update status & PIC satu item checklist (Tahap D, "Papan Tracking") --
 * SENGAJA action terpisah dari `updateEventChecklistItem` di atas: yang
 * itu untuk Admin edit kategori/nama/detail item (Tahap C), ini khusus
 * untuk staf 3 divisi operasional update progress di halaman tracking
 * mereka sendiri. RLS `event_checklist_items_update` sudah membuka UPDATE
 * ke 3 divisi + akses penuh sejak migrasi 0053, jadi tidak perlu guard
 * tambahan di sini -- Supabase yang menolak kalau bukan haknya.
 */
export async function updateEventChecklistProgress(
  id: string,
  eventId: string,
  input: UpdateChecklistProgressInput
): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_checklist_items")
    .update({ status: input.status, pic: input.picId })
    .eq("id", id);

  if (error) {
    console.error("[events] updateEventChecklistProgress gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(`${TRACKING_PATH}/${eventId}`);
  revalidatePath(`${EVENTS_PATH}/${eventId}`);
  return { ok: true };
}

export async function deleteEventChecklistItem(id: string, eventId: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("event_checklist_items").delete().eq("id", id);
  if (error) {
    console.error("[events] deleteEventChecklistItem gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(`${EVENTS_PATH}/${eventId}`);
  return { ok: true };
}

/** Import massal checklist AKTUAL satu event -- sama persis pola/parser
 * dengan `bulkImportTemplateItems`, cuma target tabelnya `event_checklist_
 * items` (status default "Belum Mulai", pic kosong -- diisi belakangan di
 * Papan Tracking, Tahap D). */
export async function bulkImportEventChecklistItems(
  eventId: string,
  rows: TemplateImportRow[],
  mode: "replace" | "append"
): Promise<{ ok: true; summary: TemplateImportSummary } | { ok: false; error: string }> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: "Tidak ada baris data untuk diimpor." };
  }

  const supabase = await createClient();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("name")
    .eq("id", eventId)
    .maybeSingle();
  if (eventError || !event) return { ok: false, error: "Event tidak ditemukan." };

  if (mode === "replace") {
    const { error: deleteError } = await supabase.from("event_checklist_items").delete().eq("event_id", eventId);
    if (deleteError) {
      console.error("[events] bulkImportEventChecklistItems: gagal hapus item lama:", deleteError.message);
      return { ok: false, error: GENERIC_ERROR };
    }
  }

  const summary: TemplateImportSummary = { inserted: 0, skipped: 0, errors: [] };
  const toInsert: {
    event_id: string;
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
      event_id: eventId,
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

  const { error: insertError } = await supabase.from("event_checklist_items").insert(toInsert);
  if (insertError) {
    console.error("[events] bulkImportEventChecklistItems: gagal simpan:", insertError.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  summary.inserted = toInsert.length;

  revalidatePath(`${EVENTS_PATH}/${eventId}`);
  void logActivity({
    module: "admin",
    action: "create",
    entityType: "checklist event",
    entityLabel: `${event.name} (${summary.inserted} item diimpor)`,
  });
  return { ok: true, summary };
}

/** Cari booking/proyek yang sudah ada di satu divisi untuk dikaitkan ke
 * event (dipanggil dari kotak pencarian di halaman detail event) -- baca
 * biasa, TAPI harus lewat Server Action (bukan data.ts) karena dipicu
 * interaksi client (mengetik kata kunci), bukan render awal halaman. */
export async function searchLinkableSources(sourceType: EventSourceType, query: string): Promise<LinkableSource[]> {
  const q = query.trim();
  if (!q) return [];
  const supabase = await createClient();
  const like = `%${q}%`;

  if (sourceType === "magnarent_booking") {
    const { data } = await supabase
      .from("magnarent_bookings")
      .select("id, nama_klien, tanggal_mulai")
      .ilike("nama_klien", like)
      .limit(20);
    return (data ?? []).map((r) => ({
      sourceType,
      sourceId: r.id as string,
      label: `${r.nama_klien} — ${r.tanggal_mulai ?? "?"}`,
    }));
  }
  if (sourceType === "magnative_project") {
    const { data } = await supabase.from("magnative_projects").select("id, name").ilike("name", like).limit(20);
    return (data ?? []).map((r) => ({ sourceType, sourceId: r.id as string, label: r.name as string }));
  }
  const { data } = await supabase.from("production_booth_projects").select("id, name").ilike("name", like).limit(20);
  return (data ?? []).map((r) => ({ sourceType, sourceId: r.id as string, label: r.name as string }));
}

export async function addEventLink(
  eventId: string,
  sourceType: EventSourceType,
  sourceId: string,
  label: string
): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_links")
    .insert({ event_id: eventId, source_type: sourceType, source_id: sourceId });

  if (error) {
    console.error("[events] addEventLink gagal:", error.message);
    if (error.code === "23505") return { ok: false, error: "Data ini sudah dikaitkan ke event." };
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(`${EVENTS_PATH}/${eventId}`);
  void logActivity({
    module: "admin",
    action: "create",
    entityType: "kaitan event",
    entityLabel: label,
  });
  return { ok: true };
}

export async function removeEventLink(id: string, eventId: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("event_links").delete().eq("id", id);
  if (error) {
    console.error("[events] removeEventLink gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(`${EVENTS_PATH}/${eventId}`);
  return { ok: true };
}
