/**
 * Tipe untuk modul baru "Tracking Progress Event" (ceklis running event,
 * permintaan Owner -- migrasi 0053). Tahap B: kelola jenis event + template
 * checklist standarnya (dikelola Admin, dipakai saat bikin event baru di
 * Tahap C supaya checklist tidak perlu diketik ulang dari nol tiap kali).
 */

export type EventType = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
};

/** Satu baris template checklist milik satu jenis event -- di-clone jadi
 * `event_checklist_items` waktu event baru dibuat dari jenis ini (Tahap C). */
export type EventTypeTemplateItem = {
  id: string;
  eventTypeId: string;
  category: string;
  itemName: string;
  detail?: string;
  qtyInfo?: string;
  notes?: string;
  sortOrder: number;
};

export type CreateEventTypeInput = {
  name: string;
  description?: string;
};

export type TemplateItemInput = {
  category: string;
  itemName: string;
  detail?: string;
  qtyInfo?: string;
  notes?: string;
};

/**
 * Satu baris hasil parsing Excel/CSV di client (lihat EventTypeManager.tsx)
 * SEBELUM disimpan -- parser mendukung DUA bentuk file sumber:
 *  1. Ada kolom "Kategori" eksplisit di setiap baris (format tabular biasa).
 *  2. TIDAK ada kolom Kategori -- kategori muncul sebagai baris tersendiri
 *     (mis. "A. VENUE") yang isinya cuma nama kategori, lalu diikuti
 *     baris-baris item di bawahnya sampai kategori berikutnya. Ini bentuk
 *     checklist asli yang dicontohkan Owner (mis. "Grab KOL Gathering").
 */
export type TemplateImportRow = {
  category: string;
  itemName: string;
  detail?: string;
  qtyInfo?: string;
  notes?: string;
};

export type TemplateImportSummary = {
  inserted: number;
  skipped: number;
  errors: string[];
};

// ---------------------------------------------------------------------
// Tahap C: event AKTUAL (bukan template lagi) -- dibuat dari salah satu
// EventType di atas (opsional -- boleh juga tanpa jenis, checklist kosong
// lalu diisi manual/import sendiri), checklist-nya hasil clone dari
// template jenis tsb, dan bisa dikaitkan ke booking/proyek yang sudah ada
// di masing-masing divisi (event_links, migrasi 0053) -- itulah dasar
// akses baca lintas-divisi yang diminta Owner.
// ---------------------------------------------------------------------

export type EventStatus = "Berjalan" | "Selesai" | "Dibatalkan";
export const EVENT_STATUSES: EventStatus[] = ["Berjalan", "Selesai", "Dibatalkan"];

/** 5 tahap dari diagram Owner (Sample -> Approval -> Preparation ->
 * Production -> Finish) PLUS "Belum Mulai" sebagai status awal item yang
 * baru di-clone/dibuat -- berlaku untuk SEMUA kategori item (bukan cuma
 * barang fisik), lihat diskusi Tahap awal modul ini. */
export type EventChecklistStatus = "Belum Mulai" | "Sample" | "Approval" | "Preparation" | "Production" | "Finish";
export const EVENT_CHECKLIST_STATUSES: EventChecklistStatus[] = [
  "Belum Mulai",
  "Sample",
  "Approval",
  "Preparation",
  "Production",
  "Finish",
];

export type EventSourceType = "magnarent_booking" | "magnative_project" | "production_booth_project";

export const EVENT_SOURCE_LABELS: Record<EventSourceType, string> = {
  magnarent_booking: "Booking Magnarent",
  magnative_project: "Proyek Magnativ",
  production_booth_project: "Proyek Booth Production",
};

export type EventSummary = {
  id: string;
  name: string;
  clientName?: string;
  eventTypeId?: string;
  eventTypeName?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  status: EventStatus;
  notes?: string;
  createdAt: string;
};

export type EventChecklistItem = {
  id: string;
  eventId: string;
  category: string;
  itemName: string;
  detail?: string;
  qtyInfo?: string;
  notes?: string;
  status: EventChecklistStatus;
  pic?: string;
  sortOrder: number;
};

export type EventLink = {
  id: string;
  eventId: string;
  sourceType: EventSourceType;
  sourceId: string;
  sourceLabel: string;
  createdAt: string;
};

export type EventDetail = {
  event: EventSummary;
  checklistItems: EventChecklistItem[];
  links: EventLink[];
};

export type CreateEventInput = {
  name: string;
  clientName?: string;
  eventTypeId?: string | null;
  location?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
};

export type LinkableSource = {
  sourceType: EventSourceType;
  sourceId: string;
  label: string;
};
