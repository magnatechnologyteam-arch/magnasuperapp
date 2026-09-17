import { createClient } from "@/lib/supabase/server";
import type {
  EventChecklistItem,
  EventDetail,
  EventLink,
  EventSourceType,
  EventStatus,
  EventSummary,
  EventType,
  EventTypeTemplateItem,
  PicOption,
} from "./types";

type EventTypeRow = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

function mapEventType(row: EventTypeRow): EventType {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

/** Semua jenis event, TERMASUK yang nonaktif -- dipakai halaman Admin
 * (Tahap B) supaya jenis lama yang sudah tidak dipakai lagi tetap kelihatan
 * (untuk dinonaktifkan/diaktifkan lagi), bukan cuma yang aktif. Saat bikin
 * event baru (Tahap C), pemilihan jenis event akan difilter ke yang aktif
 * saja di sisi situ. */
export async function getEventTypes(): Promise<EventType[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_types")
    .select("id, name, description, is_active, created_at")
    .order("name", { ascending: true })
    .returns<EventTypeRow[]>();

  if (error) {
    console.error("[events] getEventTypes gagal:", error.message);
    return [];
  }
  return (data ?? []).map(mapEventType);
}

type TemplateItemRow = {
  id: string;
  event_type_id: string;
  category: string;
  item_name: string;
  detail: string | null;
  qty_info: string | null;
  notes: string | null;
  sort_order: number;
};

function mapTemplateItem(row: TemplateItemRow): EventTypeTemplateItem {
  return {
    id: row.id,
    eventTypeId: row.event_type_id,
    category: row.category,
    itemName: row.item_name,
    detail: row.detail ?? undefined,
    qtyInfo: row.qty_info ?? undefined,
    notes: row.notes ?? undefined,
    sortOrder: row.sort_order,
  };
}

/** SEMUA template item lintas jenis event, diambil sekaligus (bukan per
 * jenis event satu-satu) -- jumlahnya wajar untuk dimuat sekaligus (tiap
 * jenis event biasanya puluhan item, lihat contoh "Grab KOL Gathering" yang
 * ~90 baris), jadi halaman Admin cukup satu query lalu difilter di client
 * saat Admin memilih satu jenis event untuk dikelola -- sama seperti pola
 * ProductManager memuat seluruh katalog produk sekaligus. */
export async function getAllEventTypeTemplateItems(): Promise<EventTypeTemplateItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_type_template_items")
    .select("id, event_type_id, category, item_name, detail, qty_info, notes, sort_order")
    .order("sort_order", { ascending: true })
    .returns<TemplateItemRow[]>();

  if (error) {
    console.error("[events] getAllEventTypeTemplateItems gagal:", error.message);
    return [];
  }
  return (data ?? []).map(mapTemplateItem);
}

// ---------------------------------------------------------------------
// Tahap C: event AKTUAL -- lihat komentar di types.ts.
// ---------------------------------------------------------------------

type EventRow = {
  id: string;
  name: string;
  client_name: string | null;
  event_type_id: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  event_types: { name: string } | null;
};

function mapEvent(row: EventRow): EventSummary {
  return {
    id: row.id,
    name: row.name,
    clientName: row.client_name ?? undefined,
    eventTypeId: row.event_type_id ?? undefined,
    eventTypeName: row.event_types?.name ?? undefined,
    location: row.location ?? undefined,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    status: row.status as EventStatus,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

const EVENT_SELECT =
  "id, name, client_name, event_type_id, location, start_date, end_date, status, notes, created_at, event_types(name)";

/** Semua event, terbaru duluan -- halaman Admin (Tahap C) belum perlu
 * paginasi, jumlah event yang sedang berjalan/baru selesai wajar untuk
 * ditampilkan sekaligus.
 *
 * `withProgress` (Tahap E, dashboard ringkasan) -- kalau true, tiap event
 * ikut dilengkapi `checklistTotal`/`checklistDone` (lihat
 * `attachChecklistProgress` di bawah). Opsional (default false) supaya
 * pemanggil yang tidak butuh progress (mis. dropdown pilih event di form
 * lain) tidak menanggung query tambahan itu. */
export async function getEvents(options?: { withProgress?: boolean }): Promise<EventSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .order("created_at", { ascending: false })
    .returns<EventRow[]>();

  if (error) {
    console.error("[events] getEvents gagal:", error.message);
    return [];
  }
  const events = (data ?? []).map(mapEvent);
  if (!options?.withProgress) return events;
  return attachChecklistProgress(supabase, events);
}

/** Isi `checklistTotal`/`checklistDone` tiap event dalam SATU query
 * tambahan (bukan N+1 per event) -- ambil `event_id, status` semua item
 * checklist milik event-event yang diminta, lalu dihitung di JS. Dipakai
 * dashboard ringkasan Admin (Tahap E) & daftar Papan Tracking (Tahap D). */
async function attachChecklistProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  events: EventSummary[]
): Promise<EventSummary[]> {
  if (events.length === 0) return events;
  const ids = events.map((e) => e.id);
  const { data, error } = await supabase.from("event_checklist_items").select("event_id, status").in("event_id", ids);
  if (error) {
    console.error("[events] attachChecklistProgress gagal:", error.message);
    return events;
  }

  const countByEvent = new Map<string, { total: number; done: number }>();
  for (const row of data ?? []) {
    const bucket = countByEvent.get(row.event_id) ?? { total: 0, done: 0 };
    bucket.total += 1;
    if (row.status === "Finish") bucket.done += 1;
    countByEvent.set(row.event_id, bucket);
  }

  return events.map((event) => {
    const counts = countByEvent.get(event.id);
    return { ...event, checklistTotal: counts?.total ?? 0, checklistDone: counts?.done ?? 0 };
  });
}

type ChecklistItemRow = {
  id: string;
  event_id: string;
  category: string;
  item_name: string;
  detail: string | null;
  qty_info: string | null;
  notes: string | null;
  status: string;
  pic: string | null;
  sort_order: number;
};

function mapChecklistItem(row: ChecklistItemRow): EventChecklistItem {
  return {
    id: row.id,
    eventId: row.event_id,
    category: row.category,
    itemName: row.item_name,
    detail: row.detail ?? undefined,
    qtyInfo: row.qty_info ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status as EventChecklistItem["status"],
    pic: row.pic ?? undefined,
    sortOrder: row.sort_order,
  };
}

type LinkRow = {
  id: string;
  event_id: string;
  source_type: EventSourceType;
  source_id: string;
  created_at: string;
};

/** Label manusiawi tiap sumber kaitan -- diambil TERPISAH per tabel divisi
 * (bukan embedded select) karena tabel sumbernya beda-beda (magnarent_
 * bookings pakai nama_klien, dua lainnya pakai name) dan `event_links`
 * tidak punya FK literal ke salah satu tabel tsb (source_id polimorfik). */
async function resolveSourceLabels(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sourceType: EventSourceType,
  ids: string[]
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();

  if (sourceType === "magnarent_booking") {
    const { data } = await supabase.from("magnarent_bookings").select("id, nama_klien, tanggal_mulai").in("id", ids);
    return new Map((data ?? []).map((r) => [r.id as string, `${r.nama_klien} — ${r.tanggal_mulai ?? "?"}`]));
  }
  if (sourceType === "magnative_project") {
    const { data } = await supabase.from("magnative_projects").select("id, name").in("id", ids);
    return new Map((data ?? []).map((r) => [r.id as string, r.name as string]));
  }
  const { data } = await supabase.from("production_booth_projects").select("id, name").in("id", ids);
  return new Map((data ?? []).map((r) => [r.id as string, r.name as string]));
}

/** Detail satu event lengkap dengan checklist & kaitannya -- dipakai
 * halaman detail Admin (Tahap C: `/dashboard/admin/events/[id]`). */
export async function getEventById(id: string): Promise<EventDetail | null> {
  const supabase = await createClient();
  const { data: eventRow, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("id", id)
    .maybeSingle<EventRow>();

  if (error || !eventRow) {
    if (error) console.error("[events] getEventById gagal:", error.message);
    return null;
  }

  const [{ data: itemRows, error: itemsError }, { data: linkRows, error: linksError }] = await Promise.all([
    supabase
      .from("event_checklist_items")
      .select("id, event_id, category, item_name, detail, qty_info, notes, status, pic, sort_order")
      .eq("event_id", id)
      .order("sort_order", { ascending: true })
      .returns<ChecklistItemRow[]>(),
    supabase
      .from("event_links")
      .select("id, event_id, source_type, source_id, created_at")
      .eq("event_id", id)
      .order("created_at", { ascending: true })
      .returns<LinkRow[]>(),
  ]);

  if (itemsError) console.error("[events] getEventById: gagal ambil checklist:", itemsError.message);
  if (linksError) console.error("[events] getEventById: gagal ambil kaitan:", linksError.message);

  const linksBySource = new Map<EventSourceType, LinkRow[]>();
  for (const link of linkRows ?? []) {
    const bucket = linksBySource.get(link.source_type) ?? [];
    bucket.push(link);
    linksBySource.set(link.source_type, bucket);
  }

  const labelMaps = await Promise.all(
    Array.from(linksBySource.entries()).map(async ([sourceType, rows]) => [
      sourceType,
      await resolveSourceLabels(supabase, sourceType, rows.map((r) => r.source_id)),
    ] as const)
  );
  const labelBySourceType = new Map(labelMaps);

  const links: EventLink[] = (linkRows ?? []).map((row) => ({
    id: row.id,
    eventId: row.event_id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    sourceLabel: labelBySourceType.get(row.source_type)?.get(row.source_id) ?? "(data tidak ditemukan)",
    createdAt: row.created_at,
  }));

  const picIds = Array.from(new Set((itemRows ?? []).map((r) => r.pic).filter((v): v is string => !!v)));
  const picNameById = await resolvePicNames(supabase, picIds);
  const checklistItems: EventChecklistItem[] = (itemRows ?? []).map((row) => ({
    ...mapChecklistItem(row),
    picName: row.pic ? picNameById.get(row.pic) : undefined,
  }));

  return {
    event: mapEvent(eventRow),
    checklistItems,
    links,
  };
}

/** Nama tampilan untuk kolom `pic` (uuid) tiap item checklist -- lihat
 * komentar `picName` di types.ts. Query terpisah (bukan embedded select)
 * karena `event_checklist_items.pic` sengaja tidak diberi FK literal ke
 * `profiles` (menghindari constraint tambahan lintas skema RLS berbeda). */
async function resolvePicNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  picIds: string[]
): Promise<Map<string, string>> {
  if (picIds.length === 0) return new Map();
  const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", picIds);
  if (error) {
    console.error("[events] resolvePicNames gagal:", error.message);
    return new Map();
  }
  return new Map((data ?? []).map((r) => [r.id as string, r.full_name as string]));
}

type PicProfileRow = { id: string; full_name: string; division: PicOption["division"] };

/** Staf yang bisa ditunjuk sebagai PIC di Papan Tracking (Tahap D) -- 3
 * divisi operasional + akses penuh, diurutkan per divisi lalu nama supaya
 * gampang di-scan di dropdown. Bergantung pada RLS `profiles` baru
 * ("Lihat profil staf operasional untuk penunjukan PIC", migrasi
 * `event_tracking_board_pic_visibility`) yang membuka lintas-divisi khusus
 * untuk keperluan ini -- sebelumnya staf cuma bisa lihat profil sendiri. */
export async function getAssignablePics(): Promise<PicOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, division")
    .in("division", ["magnarent", "magnative", "production", "all"])
    .order("division", { ascending: true })
    .order("full_name", { ascending: true })
    .returns<PicProfileRow[]>();

  if (error) {
    console.error("[events] getAssignablePics gagal:", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({ id: row.id, fullName: row.full_name, division: row.division }));
}
