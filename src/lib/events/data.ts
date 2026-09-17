import { createClient } from "@/lib/supabase/server";
import type { EventType, EventTypeTemplateItem } from "./types";

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
