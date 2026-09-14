import { createClient } from "@/lib/supabase/server";
import {
  rowToProduct,
  rowToProductImportSource,
  rowToProductPhoto,
  type ProductImportSourceRow,
  type ProductPhotoRow,
  type ProductRow,
} from "./mappers";
import type { Product, ProductImportSource } from "./types";

/**
 * Query bersama produk + galeri fotonya — dipakai baik halaman admin
 * (`/dashboard/admin/produk`, bisa edit) maupun halaman tim
 * (`/dashboard/katalog-produk`, read-only). Dipisah ke sini (bukan
 * `actions.ts`, yang ber-"use server" dan semua export-nya wajib fungsi
 * yang dipanggil sebagai Server Action) supaya query baca biasa ini bisa
 * langsung dipakai dari Server Component tanpa jadi Server Action.
 */
export async function getProductsWithPhotos(): Promise<Product[]> {
  const supabase = await createClient();

  const [productsRes, photosRes] = await Promise.all([
    supabase.from("products").select("*").order("created_at", { ascending: false }).returns<ProductRow[]>(),
    supabase
      .from("product_photos")
      .select("*")
      .order("sort_order", { ascending: true })
      .returns<ProductPhotoRow[]>(),
  ]);

  if (productsRes.error) console.error("[products] Gagal memuat katalog produk:", productsRes.error.message);
  if (photosRes.error) console.error("[products] Gagal memuat galeri foto produk:", photosRes.error.message);

  const photosByProduct = new Map<string, ProductPhotoRow[]>();
  for (const row of photosRes.data ?? []) {
    const list = photosByProduct.get(row.product_id) ?? [];
    list.push(row);
    photosByProduct.set(row.product_id, list);
  }

  return (productsRes.data ?? []).map((row) =>
    rowToProduct(row, (photosByProduct.get(row.id) ?? []).map(rowToProductPhoto))
  );
}

/** Daftar sumber impor terkonfigurasi (Tahap 29) — dipakai halaman admin
 * untuk menampilkan tombol "Sinkron Sekarang" per sumber. */
export async function getImportSources(): Promise<ProductImportSource[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_import_sources")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<ProductImportSourceRow[]>();

  if (error) console.error("[products] Gagal memuat sumber impor:", error.message);
  return (data ?? []).map(rowToProductImportSource);
}
