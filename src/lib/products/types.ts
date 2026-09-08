export type ProductDivision = "magnarent" | "magnativ" | "production" | "umum";

export type Product = {
  id: string;
  name: string;
  division: ProductDivision;
  category: string;
  sku?: string;
  price: number;
  unit: string;
  stock: number;
  supplier?: string;
  photoUrl?: string;
  photoStoragePath?: string;
  catatan?: string;
};

/**
 * Satu baris hasil parsing Excel/CSV di client (lihat ProductManager.tsx)
 * SEBELUM divalidasi/disimpan — field opsional karena kolom di file sumber
 * bisa saja tidak lengkap/tidak ada, jadi divalidasi ulang di
 * `bulkImportProducts` (actions.ts) sebelum masuk database.
 */
export type ProductImportRow = {
  name: string;
  division?: ProductDivision;
  category?: string;
  sku?: string;
  price?: number;
  unit?: string;
  stock?: number;
  supplier?: string;
  catatan?: string;
};

export type ImportSummary = {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
};
