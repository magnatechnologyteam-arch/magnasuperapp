import type { Division } from "@/lib/supabase/types";

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

/** Field TAMBAHAN khusus checklist event AKTUAL (Tahap C) -- vendor/tim/
 * deadline TIDAK berlaku untuk template jenis event (`TemplateItemInput`
 * di atas dipakai bersama), karena vendor & deadline baru masuk akal
 * begitu event sungguhan sudah dibuat. Migrasi 0063, rekomendasi 3/4/5. */
export type ChecklistItemExtraInput = {
  vendorId?: string | null;
  team?: string;
  dueDate?: string;
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
  /** Jumlah item checklist & yang sudah "Finish" (Tahap E) -- dipakai
   * dashboard ringkasan Admin & Papan Tracking untuk progress bar per
   * event, TANPA perlu buka detail satu-satu. undefined kalau caller
   * belum minta dihitung (lihat `getEvents({ withProgress: true })`). */
  checklistTotal?: number;
  checklistDone?: number;
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
  /** id profil (uuid) staf yang ditugaskan -- diisi/diubah lewat Papan
   * Tracking (Tahap D), bukan di halaman detail Admin (Tahap C). */
  pic?: string;
  /** Nama tampilan untuk `pic` di atas, diresolusi di data.ts (Tahap D) --
   * dipisah dari `pic` (uuid) supaya UI tidak perlu query profiles sendiri. */
  picName?: string;
  sortOrder: number;
  /** Kaitan opsional ke `magnative_vendors` (rekomendasi 3 laporan gap-
   * event vs SOP, migrasi 0063) -- sourcing (harga/kategori vendor)
   * langsung terlihat dari checklist. Diisi/diubah di halaman detail
   * Admin (Tahap C), sama seperti category/itemName. */
  vendorId?: string;
  /** Nama tampilan untuk `vendorId` di atas, diresolusi di data.ts --
   * dipisah dari `vendorId` (uuid) sama pola dengan `picName`. */
  vendorName?: string;
  /** Nama tim penanggung jawab item (mis. "Tim Creative"/"Tim Project"),
   * bebas teks -- rekomendasi 4 laporan gap-event vs SOP, migrasi 0063. */
  team?: string;
  /** Tanggal target/deadline BARIS INI (beda dari tanggal mulai/selesai
   * event secara keseluruhan) -- rekomendasi 5 laporan gap-event vs SOP,
   * migrasi 0063. */
  dueDate?: string;
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

// ---------------------------------------------------------------------
// Tahap D: "Papan Tracking" -- update status & PIC tiap item checklist,
// terbuka untuk 3 divisi operasional + akses penuh (lihat RLS
// `event_checklist_items_update`, sudah dibuka sejak migrasi 0053).
// Halaman terpisah dari detail Admin (Tahap C) di /dashboard/admin/events
// -- Papan Tracking ada di /dashboard/tracking-event, tanpa fitur kelola
// event (tambah/hapus item, kaitan) yang tetap khusus Admin.
// ---------------------------------------------------------------------

/** Staf yang bisa ditunjuk sebagai PIC -- profil dari 3 divisi operasional
 * + akses penuh (lihat policy profiles baru "Lihat profil staf operasional
 * untuk penunjukan PIC"), TIDAK termasuk investor. */
export type PicOption = {
  id: string;
  fullName: string;
  division: Division;
};

/** Opsi dropdown vendor Magnativ untuk dikaitkan ke checklist item (Tahap
 * C, migrasi 0063, rekomendasi 3) -- dipakai `EventDetailManager.tsx`.
 * Cuma id+name (bukan seluruh `Vendor` dari lib/magnative/types) supaya
 * modul Events tidak perlu import tipe modul Magnative secara langsung,
 * konsisten dengan semangat "tiap modul berdiri sendiri". */
export type VendorOption = {
  id: string;
  name: string;
};

/** Preset nama tim untuk dropdown `team` di form checklist item -- staf
 * tetap bisa isi nama tim lain lewat opsi "Lainnya" (lihat
 * EventDetailManager.tsx), field-nya sendiri bebas teks di DB. */
export const CHECKLIST_TEAM_PRESETS = ["Tim Creative", "Tim Project"] as const;

export type UpdateChecklistProgressInput = {
  status: EventChecklistStatus;
  picId: string | null;
};

/**
 * Satu baris riwayat perubahan status/PIC (papan tulis Owner: "Preparation
 * PIC", "Production PIC", "Finish PIC" ditulis terpisah -- `pic` di
 * `EventChecklistItem` cuma satu nilai yang DITIMPA tiap kali status
 * berubah, tidak ada histori siapa yang pegang di tahap apa). Tabel
 * `event_checklist_status_log` APPEND-ONLY -- satu baris baru ditulis tiap
 * kali `updateEventChecklistProgress` dipanggil (migrasi 0065). */
export type ChecklistStatusLogEntry = {
  id: string;
  checklistItemId: string;
  status: EventChecklistStatus;
  picId?: string;
  picName?: string;
  changedAt: string;
};
