import type { Product, ProductDivision } from "./types";

/**
 * Bentuk baris mentah dari Supabase (snake_case, sesuai kolom di migrasi
 * 0013) — dipisah dari `actions.ts` karena file itu ber-"use server" dan
 * semua export-nya wajib fungsi async (aturan Next.js), pola sama seperti
 * mapper modul lain (magnative/mappers.ts, dsb).
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
};

export function rowToProduct(row: ProductRow): Product {
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
    photoUrl: row.photo_url ?? undefined,
    photoStoragePath: row.photo_storage_path ?? undefined,
    catatan: row.catatan ?? undefined,
  };
}
