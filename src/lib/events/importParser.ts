import type { TemplateImportRow } from "./types";

/**
 * Parser Excel/CSV checklist -- dipakai BERSAMA oleh EventTypeManager.tsx
 * (import template per jenis event, Tahap B) dan EventDetailManager.tsx
 * (import checklist AKTUAL per event, Tahap C) karena bentuk file
 * sumbernya identik -- dipisah ke sini supaya tidak ada dua salinan
 * logika parsing yang bisa diam-diam berbeda.
 *
 * Header di file sumber dicocokkan longgar (huruf kecil, tanpa
 * spasi/simbol) -- sama seperti pola di ProductManager.tsx.
 */
function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export type ItemField = "no" | "itemName" | "detail" | "qtyInfo" | "notes" | "category";

export const ITEM_HEADER_MAP: Record<string, ItemField> = {
  no: "no",
  nomor: "no",
  item: "itemName",
  nama: "itemName",
  namaitem: "itemName",
  pekerjaan: "itemName",
  detail: "detail",
  deskripsi: "detail",
  spesifikasi: "detail",
  qtydurasi: "qtyInfo",
  qty: "qtyInfo",
  durasi: "qtyInfo",
  jumlah: "qtyInfo",
  quantity: "qtyInfo",
  keterangan: "notes",
  catatan: "notes",
  notes: "notes",
  note: "notes",
  kategori: "category",
  category: "category",
  kelompok: "category",
};

/**
 * Parser dua-mode (lihat komentar `TemplateImportRow` di types.ts):
 *  - Kalau header punya kolom "Kategori" eksplisit, kategori diambil per
 *    baris dari kolom itu.
 *  - Kalau TIDAK, baris yang cuma kolom "Item"-nya terisi (Detail/Qty/
 *    Keterangan semua kosong) dianggap baris judul kategori (mis.
 *    "A. VENUE") -- sama seperti bentuk checklist asli yang dicontohkan
 *    Owner (Grab KOL Gathering). Baris sesudahnya ikut kategori itu sampai
 *    ketemu baris judul kategori berikutnya.
 */
export function parseChecklistSheet(raw2d: unknown[][]): { rows: TemplateImportRow[]; error?: string } {
  let headerIdx = -1;
  let colIndexFor: Partial<Record<ItemField, number>> = {};

  for (let r = 0; r < Math.min(raw2d.length, 15); r++) {
    const row = raw2d[r] ?? [];
    const map: Partial<Record<ItemField, number>> = {};
    let nonEmptyCount = 0;
    row.forEach((cell, i) => {
      const text = String(cell ?? "").trim();
      if (!text) return;
      nonEmptyCount++;
      const field = ITEM_HEADER_MAP[normalizeHeader(text)];
      if (field && map[field] === undefined) map[field] = i;
    });
    if (map.itemName !== undefined && nonEmptyCount >= 2) {
      headerIdx = r;
      colIndexFor = map;
      break;
    }
  }

  if (headerIdx === -1 || colIndexFor.itemName === undefined) {
    return { rows: [], error: "Format file tidak dikenali -- pastikan ada kolom \"Item\" di salah satu baris." };
  }

  const hasCategoryColumn = colIndexFor.category !== undefined;
  const get = (row: unknown[], field: ItemField): string => {
    const idx = colIndexFor[field];
    if (idx === undefined) return "";
    return String(row[idx] ?? "").trim();
  };

  let currentCategory = "";
  const rows: TemplateImportRow[] = [];
  for (let r = headerIdx + 1; r < raw2d.length; r++) {
    const row = raw2d[r] ?? [];
    const itemName = get(row, "itemName");
    const detail = get(row, "detail");
    const qtyInfo = get(row, "qtyInfo");
    const notes = get(row, "notes");
    const categoryCell = get(row, "category");

    if (!itemName && !categoryCell) continue;

    if (!hasCategoryColumn && itemName && !detail && !qtyInfo && !notes) {
      // Baris judul kategori -- cuma kolom Item yang terisi.
      currentCategory = itemName;
      continue;
    }

    if (!itemName) continue;

    if (hasCategoryColumn && categoryCell) currentCategory = categoryCell;

    rows.push({
      category: currentCategory || "Umum",
      itemName,
      detail: detail || undefined,
      qtyInfo: qtyInfo || undefined,
      notes: notes || undefined,
    });
  }

  return { rows };
}
