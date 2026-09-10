"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";
import type { ImportSummary, ProductDivision, ProductImportRow } from "./types";

const MODULE_PATH = "/dashboard/admin/produk";
const GENERIC_ERROR = "Terjadi kesalahan, coba lagi.";
const PRODUCT_BUCKET = "product-photos";
const VALID_DIVISIONS: ProductDivision[] = ["magnarent", "magnativ", "production", "umum"];

export type MutationResult = { ok: true } | { ok: false; error: string };
export type ImportResult = { ok: true; summary: ImportSummary } | { ok: false; error: string };

/**
 * Pakai `FormData` (bukan objek biasa) sama seperti `addPortfolioPhoto` di
 * `src/lib/magnative/actions.ts` — field foto opsional di sini, jadi satu
 * fungsi ini menangani baik produk dengan foto maupun tanpa foto lewat
 * jalur yang sama, daripada dipecah jadi dua Server Action terpisah.
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

export async function addProduct(formData: FormData): Promise<MutationResult> {
  const supabase = await createClient();
  const fields = parseProductFields(formData);

  if (!fields.name) {
    return { ok: false, error: "Nama produk wajib diisi." };
  }

  let photoUrl: string | null = null;
  let photoStoragePath: string | null = null;

  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return { ok: false, error: "File foto bukan gambar." };
    }
    const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "jpg";
    const storagePath = `${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_BUCKET)
      .upload(storagePath, file, { contentType: file.type || undefined });
    if (uploadError) {
      console.error("[products] Upload foto produk gagal:", uploadError.message);
      return { ok: false, error: GENERIC_ERROR };
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(storagePath);
    photoUrl = publicUrl;
    photoStoragePath = storagePath;
  }

  const { error } = await supabase.from("products").insert({
    name: fields.name,
    division: fields.division,
    category: fields.category,
    sku: fields.sku,
    price: fields.price,
    unit: fields.unit,
    stock: fields.stock,
    supplier: fields.supplier,
    catatan: fields.catatan,
    photo_url: photoUrl,
    photo_storage_path: photoStoragePath,
  });

  if (error) {
    console.error("[products] addProduct gagal:", error.message);
    if (photoStoragePath) await supabase.storage.from(PRODUCT_BUCKET).remove([photoStoragePath]);
    if (error.code === "23505") {
      return { ok: false, error: "SKU sudah dipakai produk lain." };
    }
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  void logActivity({ module: "admin", action: "create", entityType: "produk", entityLabel: fields.name });
  return { ok: true };
}

export async function updateProduct(id: string, formData: FormData): Promise<MutationResult> {
  const supabase = await createClient();
  const fields = parseProductFields(formData);

  if (!fields.name) {
    return { ok: false, error: "Nama produk wajib diisi." };
  }

  const updatePayload: Record<string, unknown> = {
    name: fields.name,
    division: fields.division,
    category: fields.category,
    sku: fields.sku,
    price: fields.price,
    unit: fields.unit,
    stock: fields.stock,
    supplier: fields.supplier,
    catatan: fields.catatan,
  };

  const file = formData.get("photo");
  let newStoragePath: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return { ok: false, error: "File foto bukan gambar." };
    }
    const { data: existing } = await supabase
      .from("products")
      .select("photo_storage_path")
      .eq("id", id)
      .maybeSingle();

    const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "jpg";
    newStoragePath = `${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_BUCKET)
      .upload(newStoragePath, file, { contentType: file.type || undefined });
    if (uploadError) {
      console.error("[products] Upload foto produk gagal:", uploadError.message);
      return { ok: false, error: GENERIC_ERROR };
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(newStoragePath);
    updatePayload.photo_url = publicUrl;
    updatePayload.photo_storage_path = newStoragePath;

    // Hapus foto lama SETELAH upload baru sukses — supaya kalau upload
    // baru gagal, foto lama tidak ikut hilang (baru dihapus di titik yang
    // sudah pasti aman).
    if (existing?.photo_storage_path) {
      await supabase.storage.from(PRODUCT_BUCKET).remove([existing.photo_storage_path]);
    }
  }

  const { error } = await supabase.from("products").update(updatePayload).eq("id", id);
  if (error) {
    console.error("[products] updateProduct gagal:", error.message);
    if (newStoragePath) await supabase.storage.from(PRODUCT_BUCKET).remove([newStoragePath]);
    if (error.code === "23505") {
      return { ok: false, error: "SKU sudah dipakai produk lain." };
    }
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  void logActivity({ module: "admin", action: "update", entityType: "produk", entityLabel: fields.name });
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: productRow } = await supabase
    .from("products")
    .select("name, photo_storage_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    console.error("[products] deleteProduct gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  if (productRow?.photo_storage_path) {
    await supabase.storage.from(PRODUCT_BUCKET).remove([productRow.photo_storage_path]);
  }
  revalidatePath(MODULE_PATH);
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

    const division: ProductDivision =
      row.division && VALID_DIVISIONS.includes(row.division) ? row.division : "umum";
    const sku = row.sku?.trim() || null;
    const payload = {
      name,
      division,
      category: row.category?.trim() || "",
      sku,
      price: Number.isFinite(row.price) ? Number(row.price) : 0,
      unit: row.unit?.trim() || "unit",
      stock: Number.isFinite(row.stock) ? Number(row.stock) : 0,
      supplier: row.supplier?.trim() || null,
      catatan: row.catatan?.trim() || null,
    };

    if (sku) {
      const { data: existing } = await supabase.from("products").select("id").eq("sku", sku).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("products").update(payload).eq("id", existing.id);
        if (error) {
          console.error(`[products] bulkImportProducts update baris ${index + 2} gagal:`, error.message);
          summary.skipped++;
          summary.errors.push(`Baris ${index + 2} (${name}): ${GENERIC_ERROR}`);
        } else {
          summary.updated++;
        }
        continue;
      }
    }

    const { error } = await supabase.from("products").insert(payload);
    if (error) {
      console.error(`[products] bulkImportProducts insert baris ${index + 2} gagal:`, error.message);
      summary.skipped++;
      summary.errors.push(`Baris ${index + 2} (${name}): ${GENERIC_ERROR}`);
    } else {
      summary.inserted++;
    }
  }

  revalidatePath(MODULE_PATH);
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
