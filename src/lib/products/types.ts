export type ProductDivision = "magnarent" | "magnativ" | "production" | "umum";

/** Dari mana satu foto di galeri produk berasal — dipakai buat tahu foto mana yang aman dihapus dari Storage kita sendiri ("upload") vs. yang cuma nunjuk ke URL eksternal ("whatsapp_catalog"/"website", tidak pernah kita hapus filenya karena bukan kita yang punya). */
export type ProductPhotoSource = "upload" | "whatsapp_catalog" | "website";

export type ProductPhoto = {
  id: string;
  url: string;
  storagePath?: string;
  source: ProductPhotoSource;
  sortOrder: number;
};

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
  /** Foto sampul = foto pertama di `photos` (urutan `sortOrder`) — dipertahankan
   * di sini juga supaya tempat lain yang cuma butuh SATU foto (kalau ada nanti)
   * tidak perlu tahu soal galeri sama sekali. */
  photoUrl?: string;
  photoStoragePath?: string;
  photos: ProductPhoto[];
  /** Terisi kalau produk ini berasal dari impor otomatis (Tahap 29) — dipakai
   * sebagai kunci upsert saat sinkron ulang, terpisah dari SKU. */
  externalSource?: "whatsapp_catalog" | "website";
  externalRef?: string;
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
  /** Kolom opsional "FotoURL" — satu atau beberapa URL foto dipisah koma/titik-koma,
   * supaya import massal juga bisa langsung mengisi galeri, bukan cuma data teks. */
  photoUrls?: string[];
};

export type ImportSummary = {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
};

// ---------------------------------------------------------------------
// Impor otomatis dari WhatsApp Business Catalog & website Magna lainnya
// (Tahap 29) — admin konfigurasi daftar sumber, lalu bisa "Sinkron
// Sekarang" kapan saja: hasil fetch ditampilkan sebagai preview untuk
// direview dulu sebelum benar-benar disimpan ke Katalog Produk.
// ---------------------------------------------------------------------

export type ImportSourceType = "whatsapp_catalog" | "website";

export type ProductImportSource = {
  id: string;
  type: ImportSourceType;
  label: string;
  /** type="website": URL halaman produk. type="whatsapp_catalog": Catalog ID dari Meta Commerce Manager. */
  reference: string;
  lastSyncedAt?: string;
  lastSyncSummary?: ImportSummary | null;
};

/** Status ketersediaan dari sumber luar (dibaca dari `availability` Meta
 * Graph API atau `offers.availability` schema.org JSON-LD) — dipetakan ke
 * status sederhana ini karena kedua sumber cuma menyatakan ADA/TIDAK ADA
 * stok, bukan jumlah pasti, jadi tidak dipakai untuk menebak-nebak angka
 * stok (lihat pemakaian di `commitImportCandidates`). */
export type ExternalStockStatus = "in_stock" | "out_of_stock" | "unknown";

/**
 * Satu produk hasil fetch dari sumber eksternal, SEBELUM direview admin &
 * disimpan. Tahap 29c: ditambah `catatan`/`category`/`stockStatus` supaya
 * "keterangan keseluruhan" produk (bukan cuma nama/harga/foto) ikut
 * disesuaikan dengan yang ada di sumbernya saat sinkron — lihat
 * `commitImportCandidates`. SKU SENGAJA tidak diambil dari sumber luar lagi
 * (lihat `src/lib/products/sku.ts`) — dibuat sendiri oleh aplikasi supaya
 * selalu ringkas & konsisten.
 */
export type ExternalProductCandidate = {
  externalRef: string;
  name: string;
  price?: number;
  catatan?: string;
  category?: string;
  stockStatus?: ExternalStockStatus;
  photoUrls: string[];
};

export type ImportPreviewResult =
  | { ok: true; candidates: ExternalProductCandidate[]; warnings: string[] }
  | { ok: false; error: string };
