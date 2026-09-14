import type { Product, ProductDivision, ProductImportSource, ProductPhoto, ProductPhotoSource } from "./types";

/**
 * Bentuk baris mentah dari Supabase (snake_case, sesuai kolom di migrasi
 * 0013 + 0029) — dipisah dari `actions.ts` karena file itu ber-"use server"
 * dan semua export-nya wajib fungsi async (aturan Next.js), pola sama
 * seperti mapper modul lain (magnative/mappers.ts, dsb).
 */
export type ProductRow = {
  id: string;
  name: string;
  division: ProductDivision;
  category: string;
  sku: string | null;
  price: number;
  unit: string;
  stock: number;
  supplier: string | null;
  photo_url: string | null;
  photo_storage_path: string | null;
  catatan: string | null;
  external_source: "whatsapp_catalog" | "website" | null;
  external_ref: string | null;
};

export type ProductPhotoRow = {
  id: string;
  product_id: string;
  photo_url: string;
  storage_path: string | null;
  source: ProductPhotoSource;
  sort_order: number;
};

export type ProductImportSourceRow = {
  id: string;
  type: "whatsapp_catalog" | "website";
  label: string;
  reference: string;
  last_synced_at: string | null;
  last_sync_summary: unknown;
};

export function rowToProductPhoto(row: ProductPhotoRow): ProductPhoto {
  return {
    id: row.id,
    url: row.photo_url,
    storagePath: row.storage_path ?? undefined,
    source: row.source,
    sortOrder: row.sort_order,
  };
}

/**
 * `photos` HARUS sudah diurutkan berdasarkan `sortOrder` sebelum masuk sini
 * (query pemanggil pakai `.order("sort_order")`) — fungsi ini tidak
 * mengurutkan ulang supaya tidak diam-diam menutupi urutan yang salah dari
 * pemanggilnya.
 */
export function rowToProduct(row: ProductRow, photos: ProductPhoto[] = []): Product {
  const cover = photos[0];
  return {
    id: row.id,
    name: row.name,
    division: row.division,
    category: row.category,
    sku: row.sku ?? undefined,
    price: row.price,
    unit: row.unit,
    stock: row.stock,
    supplier: row.supplier ?? undefined,
    // Fallback ke kolom lama kalau galeri kosong (mis. baru migrasi &
    // backfill belum sempat jalan untuk baris ini) — seharusnya jarang
    // terjadi karena migrasi 0029 sudah backfill semua yang ada.
    photoUrl: cover?.url ?? row.photo_url ?? undefined,
    photoStoragePath: cover?.storagePath ?? row.photo_storage_path ?? undefined,
    photos,
    externalSource: row.external_source ?? undefined,
    externalRef: row.external_ref ?? undefined,
    catatan: row.catatan ?? undefined,
  };
}

export function rowToProductImportSource(row: ProductImportSourceRow): ProductImportSource {
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    reference: row.reference,
    lastSyncedAt: row.last_synced_at ?? undefined,
    lastSyncSummary: (row.last_sync_summary as ProductImportSource["lastSyncSummary"]) ?? null,
  };
}
