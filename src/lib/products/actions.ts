"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";
import type { ProductPhotoRow } from "./mappers";
import type { ImportSummary, ProductDivision, ProductImportRow, ProductPhotoSource } from "./types";

const MODULE_PATH = "/dashboard/admin/produk";
const TEAM_VIEW_PATH = "/dashboard/katalog-produk";
const GENERIC_ERROR = "Terjadi kesalahan, coba lagi.";
const PRODUCT_BUCKET = "product-photos";
const VALID_DIVISIONS: ProductDivision[] = ["magnarent", "magnativ", "production", "umum"];
const MAX_PHOTOS_PER_UPLOAD = 10;

export type MutationResult = { ok: true } | { ok: false; error: string };
export type ImportResult = { ok: true; summary: ImportSummary } | { ok: false; error: string };

function revalidateProductPaths() {
  revalidatePath(MODULE_PATH);
  revalidatePath(TEAM_VIEW_PATH);
}

/**
 * Pakai `FormData` (bukan objek biasa) sama seperti `addPortfolioPhoto` di
 * `src/lib/magnative/actions.ts` — field foto sengaja DIPISAH dari fungsi
 * ini (lihat `addProductPhotos`/`deleteProductPhoto` di bawah) sejak
 * Tahap 29, karena satu produk sekarang bisa punya banyak foto: form
 * teks & pengelolaan galeri jadi dua aksi terpisah yang masing-masing
 * langsung tersimpan (pola sama seperti bukti pembayaran investor di
 * `capital-requests/actions.ts`), bukan satu submit besar yang harus
 * menghitung diff foto lama vs baru.
 */
function parseProductFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const divisionRaw = String(formData.get("division") ?? "umum");
  const division = (VALID_DIVISIONS.includes(divisionRaw as ProductDivision) ? divisionRaw : "umum") as ProductDivision;
  const category = String(formData.get("category") ?? "").trim();
  const skuRaw = String(formData.get("sku") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const unit = String(formData.get("unit") ?? "unit").trim() || "unit";
  const stock = Number(formData.get("stock") ?? 0);
  const supplierRaw = String(formData.get("supplier") ?? "").trim();
  const catatanRaw = String(formData.get("catatan") ?? "").trim();

  return {
    name,
    division,
    category,
    sku: skuRaw || null,
    price: Number.isFinite(price) ? price : 0,
    unit,
    stock: Number.isFinite(stock) ? stock : 0,
    supplier: supplierRaw || null,
    catatan: catatanRaw || null,
  };
}

/** Hitung ulang & tulis kolom sampul (`products.photo_url`/`photo_storage_path`)
 * dari foto ber-`sort_order` terkecil di galeri — dipanggil setiap galeri
 * berubah (tambah/hapus/reorder) supaya kolom lama itu (dipakai di
 * tabel/daftar yang cuma butuh satu foto) selalu konsisten dengan galeri
 * sebenarnya, tanpa tempat lain perlu tahu soal `product_photos` sama sekali. */
async function syncCoverPhoto(supabase: Awaited<ReturnType<typeof createClient>>, productId: string) {
  const { data: cover } = await supabase
    .from("product_photos")
    .select("photo_url, storage_path")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("products")
    .update({ photo_url: cover?.photo_url ?? null, photo_storage_path: cover?.storage_path ?? null })
    .eq("id", productId);
}

/** Upload satu file ke bucket foto produk — dipakai `addProduct` &
 * `addProductPhotos`. Mengembalikan `null` (bukan melempar) kalau upload
 * gagal, supaya pemanggil bisa memutuskan sendiri apakah itu fatal atau
 * cukup dilewati (mis. saat upload beberapa file sekaligus, satu gagal
 * tidak seharusnya membatalkan yang lain). */
async function uploadProductPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  file: File
): Promise<{ url: string; storagePath: string } | null> {
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "jpg";
  const storagePath = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(PRODUCT_BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined });
  if (error) {
    console.error("[products] Upload foto produk gagal:", error.message);
    return null;
  }
  const {
    data: { publicUrl },
  } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(storagePath);
  return { url: publicUrl, storagePath };
}

export async function addProduct(formData: FormData): Promise<MutationResult> {
  const supabase = await createClient();
  const fields = parseProductFields(formData);

  if (!fields.name) {
    return { ok: false, error: "Nama produk wajib diisi." };
  }
  if (fields.price < 0 || fields.stock < 0) {
    return { ok: false, error: "Harga dan stok tidak boleh negatif." };
  }

  const files = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_PHOTOS_PER_UPLOAD);
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return { ok: false, error: `File "${file.name}" bukan gambar.` };
    }
  }

  const { data: inserted, error } = await supabase
    .from("products")
    .insert({
      name: fields.name,
      division: fields.division,
      category: fields.category,
      sku: fields.sku,
      price: fields.price,
      unit: fields.unit,
      stock: fields.stock,
      supplier: fields.supplier,
      catatan: fields.catatan,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("[products] addProduct gagal:", error?.message);
    if (error?.code === "23505") {
      return { ok: false, error: "SKU sudah dipakai produk lain." };
    }
    return { ok: false, error: GENERIC_ERROR };
  }

  if (files.length > 0) {
    const uploaded = (await Promise.all(files.map((f) => uploadProductPhoto(supabase, f)))).filter(
      (r): r is { url: string; storagePath: string } => r !== null
    );
    if (uploaded.length > 0) {
      await supabase.from("product_photos").insert(
        uploaded.map((u, i) => ({
          product_id: inserted.id,
          photo_url: u.url,
          storage_path: u.storagePath,
          source: "upload" as ProductPhotoSource,
          sort_order: i,
        }))
      );
      await syncCoverPhoto(supabase, inserted.id);
    }
  }

  revalidateProductPaths();
  void logActivity({ module: "admin", action: "create", entityType: "produk", entityLabel: fields.name });
  return { ok: true };
}

/** Update field TEKS saja (nama, kategori, harga, dst) — pengelolaan foto
 * lewat `addProductPhotos`/`deleteProductPhoto`/`reorderProductPhotos`. */
export async function updateProduct(id: string, formData: FormData): Promise<MutationResult> {
  const supabase = await createClient();
  const fields = parseProductFields(formData);

  if (!fields.name) {
    return { ok: false, error: "Nama produk wajib diisi." };
  }
  if (fields.price < 0 || fields.stock < 0) {
    return { ok: false, error: "Harga dan stok tidak boleh negatif." };
  }

  const { error } = await supabase
    .from("products")
    .update({
      name: fields.name,
      division: fields.division,
      category: fields.category,
      sku: fields.sku,
      price: fields.price,
      unit: fields.unit,
      stock: fields.stock,
      supplier: fields.supplier,
      catatan: fields.catatan,
    })
    .eq("id", id);

  if (error) {
    console.error("[products] updateProduct gagal:", error.message);
    if (error.code === "23505") {
      return { ok: false, error: "SKU sudah dipakai produk lain." };
    }
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidateProductPaths();
  void logActivity({ module: "admin", action: "update", entityType: "produk", entityLabel: fields.name });
  return { ok: true };
}

/** Tambah satu atau beberapa foto ke galeri produk yang SUDAH ada. */
export async function addProductPhotos(productId: string, formData: FormData): Promise<MutationResult> {
  const supabase = await createClient();
  const files = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_PHOTOS_PER_UPLOAD);

  if (files.length === 0) {
    return { ok: false, error: "Pilih minimal satu file foto." };
  }
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return { ok: false, error: `File "${file.name}" bukan gambar.` };
    }
  }

  const { data: existingPhotos } = await supabase
    .from("product_photos")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrderStart = (existingPhotos?.[0]?.sort_order ?? -1) + 1;

  const uploaded = (await Promise.all(files.map((f) => uploadProductPhoto(supabase, f)))).filter(
    (r): r is { url: string; storagePath: string } => r !== null
  );
  if (uploaded.length === 0) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const { error } = await supabase.from("product_photos").insert(
    uploaded.map((u, i) => ({
      product_id: productId,
      photo_url: u.url,
      storage_path: u.storagePath,
      source: "upload" as ProductPhotoSource,
      sort_order: nextOrderStart + i,
    }))
  );
  if (error) {
    console.error("[products] addProductPhotos gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  await syncCoverPhoto(supabase, productId);
  revalidateProductPaths();
  void logActivity({ module: "admin", action: "update", entityType: "produk", detail: `${uploaded.length} foto ditambahkan` });
  return { ok: true };
}

export async function deleteProductPhoto(photoId: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: photo } = await supabase
    .from("product_photos")
    .select("product_id, storage_path")
    .eq("id", photoId)
    .maybeSingle();

  if (!photo) {
    return { ok: false, error: "Foto tidak ditemukan." };
  }

  const { error } = await supabase.from("product_photos").delete().eq("id", photoId);
  if (error) {
    console.error("[products] deleteProductPhoto gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  if (photo.storage_path) {
    await supabase.storage.from(PRODUCT_BUCKET).remove([photo.storage_path]);
  }
  await syncCoverPhoto(supabase, photo.product_id);
  revalidateProductPaths();
  return { ok: true };
}

/** `orderedPhotoIds` = seluruh id foto produk ini, urutan sesuai yang
 * diinginkan (indeks 0 = foto sampul baru). */
export async function reorderProductPhotos(productId: string, orderedPhotoIds: string[]): Promise<MutationResult> {
  if (orderedPhotoIds.length === 0) return { ok: true };
  const supabase = await createClient();

  const results = await Promise.all(
    orderedPhotoIds.map((photoId, index) =>
      supabase.from("product_photos").update({ sort_order: index }).eq("id", photoId).eq("product_id", productId)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error("[products] reorderProductPhotos gagal:", failed.error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  await syncCoverPhoto(supabase, productId);
  revalidateProductPaths();
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: productRow } = await supabase.from("products").select("name").eq("id", id).maybeSingle();
  const { data: photos } = await supabase
    .from("product_photos")
    .select("storage_path")
    .eq("product_id", id)
    .returns<Pick<ProductPhotoRow, "storage_path">[]>();

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    console.error("[products] deleteProduct gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  // `product_photos` baris-barisnya sudah ikut terhapus lewat "on delete
  // cascade" di database — tapi objek di Storage TIDAK otomatis ikut
  // terhapus (cascade cuma untuk baris tabel), jadi dibersihkan manual di
  // sini supaya tidak ada file menumpuk di bucket.
  const storagePaths = (photos ?? []).map((p) => p.storage_path).filter((p): p is string => !!p);
  if (storagePaths.length > 0) {
    await supabase.storage.from(PRODUCT_BUCKET).remove(storagePaths);
  }

  revalidateProductPaths();
  void logActivity({ module: "admin", action: "delete", entityType: "produk", entityLabel: productRow?.name });
  return { ok: true };
}

/**
 * Import massal dari Excel/CSV — file di-parse di BROWSER (lihat
 * ProductManager.tsx, pakai library `xlsx`) supaya Server Action ini cukup
 * menerima array data biasa (bukan FormData/File lagi, karena tidak ada
 * data biner yang perlu dibawa di titik ini).
 *
 * Upsert berdasarkan SKU kalau kolom SKU diisi di file sumber: baris
 * dengan SKU yang sudah ada di database akan DIPERBARUI (bukan duplikat).
 * Baris tanpa SKU selalu jadi produk baru — tidak ada cara aman
 * mencocokkan produk lama tanpa penanda unik.
 *
 * Kolom opsional "FotoURL" (Tahap 29) — satu/lebih URL foto dipisah
 * koma/titik-koma — ditambahkan ke galeri produk sebagai foto BARU dengan
 * `source: "website"` (menunjuk URL eksternal, bukan file yang kita
 * upload sendiri); tidak menghapus foto yang sudah ada di galeri produk
 * yang di-update.
 */
export async function bulkImportProducts(rows: ProductImportRow[]): Promise<ImportResult> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: "Tidak ada baris data untuk diimpor." };
  }

  const supabase = await createClient();
  const summary: ImportSummary = { inserted: 0, updated: 0, skipped: 0, errors: [] };

  for (const [index, row] of rows.entries()) {
    const name = row.name?.trim();
    if (!name) {
      summary.skipped++;
      summary.errors.push(`Baris ${index + 2}: nama produk kosong, dilewati.`);
      continue;
    }

    const price = Number.isFinite(row.price) ? Number(row.price) : 0;
    const stock = Number.isFinite(row.stock) ? Number(row.stock) : 0;
    if (price < 0 || stock < 0) {
      summary.skipped++;
      summary.errors.push(`Baris ${index + 2} (${name}): harga/stok tidak boleh negatif, dilewati.`);
      continue;
    }

    const division: ProductDivision =
      row.division && VALID_DIVISIONS.includes(row.division) ? row.division : "umum";
    const sku = row.sku?.trim() || null;
    const payload = {
      name,
      division,
      category: row.category?.trim() || "",
      sku,
      price,
      unit: row.unit?.trim() || "unit",
      stock,
      supplier: row.supplier?.trim() || null,
      catatan: row.catatan?.trim() || null,
    };

    let productId: string | null = null;

    if (sku) {
      const { data: existing } = await supabase.from("products").select("id").eq("sku", sku).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("products").update(payload).eq("id", existing.id);
        if (error) {
          console.error(`[products] bulkImportProducts update baris ${index + 2} gagal:`, error.message);
          summary.skipped++;
          summary.errors.push(`Baris ${index + 2} (${name}): ${GENERIC_ERROR}`);
          continue;
        }
        productId = existing.id;
        summary.updated++;
      }
    }

    if (!productId) {
      const { data: insertedRow, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error || !insertedRow) {
        console.error(`[products] bulkImportProducts insert baris ${index + 2} gagal:`, error?.message);
        summary.skipped++;
        summary.errors.push(`Baris ${index + 2} (${name}): ${GENERIC_ERROR}`);
        continue;
      }
      productId = insertedRow.id;
      summary.inserted++;
    }

    if (row.photoUrls && row.photoUrls.length > 0 && productId) {
      const { data: existingPhotos } = await supabase
        .from("product_photos")
        .select("sort_order")
        .eq("product_id", productId)
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextOrderStart = (existingPhotos?.[0]?.sort_order ?? -1) + 1;
      await supabase.from("product_photos").insert(
        row.photoUrls.map((url, i) => ({
          product_id: productId,
          photo_url: url,
          storage_path: null,
          source: "website" as ProductPhotoSource,
          sort_order: nextOrderStart + i,
        }))
      );
      await syncCoverPhoto(supabase, productId);
    }
  }

  revalidateProductPaths();
  if (summary.inserted > 0 || summary.updated > 0) {
    void logActivity({
      module: "admin",
      action: "update",
      entityType: "produk",
      entityLabel: "Import massal dari Excel/CSV",
      detail: `${summary.inserted} baru, ${summary.updated} diperbarui, ${summary.skipped} dilewati`,
    });
  }

  return { ok: true, summary };
}
