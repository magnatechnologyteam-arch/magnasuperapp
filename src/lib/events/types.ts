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
