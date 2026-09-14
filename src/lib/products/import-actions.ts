"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";
import { generateSku, isSkuConflict } from "./sku";
import type {
  ExternalProductCandidate,
  ExternalStockStatus,
  ImportPreviewResult,
  ImportSourceType,
  ImportSummary,
  ProductDivision,
  ProductPhotoSource,
} from "./types";

const MODULE_PATH = "/dashboard/admin/produk";
const TEAM_VIEW_PATH = "/dashboard/katalog-produk";
const GENERIC_ERROR = "Terjadi kesalahan, coba lagi.";
const GRAPH_API_VERSION = "v20.0";
const MAX_CATALOG_PAGES = 20; // batas aman ~2000 produk per sinkron — kalau katalog lebih besar dari itu, sinkron beberapa kali atau hubungi developer.
const MAX_HTML_BYTES = 5_000_000;

export type MutationResult = { ok: true } | { ok: false; error: string };
export type SourceMutationResult = { ok: true; id: string } | { ok: false; error: string };

function revalidateProductPaths() {
  revalidatePath(MODULE_PATH);
  revalidatePath(TEAM_VIEW_PATH);
}

/** Tolak host yang mengarah ke jaringan internal/lokal — sinkron website
 * memanggil `fetch()` dari SERVER dengan URL yang admin masukkan sendiri,
 * jadi penjagaan dasar ini mencegah URL itu dipakai untuk mengintip
 * jaringan internal server (SSRF) lewat literal IP/hostname yang jelas
 * privat. Bukan penjagaan sempurna (tidak resolve DNS), tapi cukup untuk
 * ancaman yang realistis di sini — cuma Owner/Finance (division "all")
 * yang bisa mengisi URL ini sama sekali.
 */
function isSafeExternalUrl(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) return false;
  if (
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------
// Kelola daftar sumber impor
// ---------------------------------------------------------------------

export async function addImportSource(formData: FormData): Promise<SourceMutationResult> {
  const type = String(formData.get("type") ?? "") as ImportSourceType;
  const label = String(formData.get("label") ?? "").trim();
  const reference = String(formData.get("reference") ?? "").trim();

  if (type !== "whatsapp_catalog" && type !== "website") {
    return { ok: false, error: "Jenis sumber tidak dikenali." };
  }
  if (!label) return { ok: false, error: "Nama sumber wajib diisi." };
  if (!reference) {
    return {
      ok: false,
      error: type === "website" ? "URL website wajib diisi." : "Catalog ID wajib diisi.",
    };
  }
  if (type === "website" && !isSafeExternalUrl(reference)) {
    return { ok: false, error: "URL tidak valid atau menunjuk ke alamat yang tidak diizinkan." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_import_sources")
    .insert({ type, label, reference })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[products] addImportSource gagal:", error?.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidateProductPaths();
  return { ok: true, id: data.id };
}

export async function deleteImportSource(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("product_import_sources").delete().eq("id", id);
  if (error) {
    console.error("[products] deleteImportSource gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidateProductPaths();
  return { ok: true };
}

// ---------------------------------------------------------------------
// Preview (fetch, belum simpan)
// ---------------------------------------------------------------------

function parsePriceString(price?: string | number): number | undefined {
  if (price === undefined || price === null) return undefined;
  const num = Number(String(price).replace(/[^0-9.]/g, ""));
  return Number.isFinite(num) ? Math.round(num) : undefined;
}

/** Meta Graph API (`availability`) & schema.org JSON-LD (`offers.availability`,
 * biasanya URL seperti "https://schema.org/InStock") sama-sama cuma
 * menyatakan ADA/TIDAK ADA stok, bukan jumlah — dipetakan ke status
 * sederhana ini, dipakai `commitImportCandidates` buat tahu kapan aman
 * menandai stok = 0 (sinyal negatif jelas) tanpa menebak angka pasti kalau
 * statusnya "tersedia" (lihat komentar di `commitImportCandidates`). */
function normalizeAvailability(raw?: string | null): ExternalStockStatus {
  if (!raw) return "unknown";
  const tail = raw.toLowerCase().split("/").pop() ?? "";
  if (/out.?of.?stock|discontinued|sold.?out|unavailable/.test(tail)) return "out_of_stock";
  if (/in.?stock|preorder|pre.?order|backorder|available/.test(tail)) return "in_stock";
  return "unknown";
}

type MetaCatalogProduct = {
  id: string;
  retailer_id?: string;
  name?: string;
  description?: string;
  price?: string;
  image_url?: string;
  additional_image_urls?: string[];
  availability?: string;
  category?: string;
};

async function fetchWhatsappCatalogCandidates(catalogId: string): Promise<ImportPreviewResult> {
  const token = process.env.META_CATALOG_ACCESS_TOKEN;
  if (!token) {
    return {
      ok: false,
      error:
        'Environment variable "META_CATALOG_ACCESS_TOKEN" belum diset di server (Vercel Project Settings > Environment Variables) — minta access token dari Meta Business Manager (Commerce Manager > Catalog > izin catalog_management) ke tim developer.',
    };
  }

  const candidates: ExternalProductCandidate[] = [];
  const warnings: string[] = [];
  let url: string | null =
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(catalogId)}/products` +
    `?fields=id,retailer_id,name,description,price,image_url,additional_image_urls,availability,category&limit=100&access_token=${encodeURIComponent(token)}`;
  let pages = 0;

  while (url && pages < MAX_CATALOG_PAGES) {
    let res: Response;
    try {
      res = await fetch(url, { cache: "no-store" });
    } catch {
      return { ok: false, error: "Gagal menghubungi WhatsApp/Meta Graph API — cek koneksi atau coba lagi." };
    }
    const json = await res.json().catch(() => null);
    if (!res.ok || !json) {
      const msg = json?.error?.message || `HTTP ${res.status}`;
      return { ok: false, error: `Meta Graph API menolak permintaan: ${msg}` };
    }

    for (const item of (json.data ?? []) as MetaCatalogProduct[]) {
      const photoUrls = [item.image_url, ...(item.additional_image_urls ?? [])].filter(
        (u): u is string => !!u
      );
      candidates.push({
        externalRef: item.retailer_id || item.id,
        name: item.name?.trim() || "(tanpa nama)",
        price: parsePriceString(item.price),
        catatan: item.description?.trim() || undefined,
        category: item.category?.trim() || undefined,
        stockStatus: normalizeAvailability(item.availability),
        photoUrls,
      });
    }
    url = json.paging?.next ?? null;
    pages++;
  }

  if (url && pages >= MAX_CATALOG_PAGES) {
    warnings.push(`Berhenti setelah ${MAX_CATALOG_PAGES} halaman (~${MAX_CATALOG_PAGES * 100} produk) — kalau katalog lebih besar, sinkron lagi nanti atau hubungi developer.`);
  }
  if (candidates.length === 0) {
    warnings.push("Tidak ada produk ditemukan di catalog ini — cek lagi Catalog ID-nya.");
  }

  return { ok: true, candidates, warnings };
}

function absoluteUrl(url: string, base: string): string {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

function matchMeta(html: string, property: string): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return undefined;
}

function matchTag(html: string, tag: string): string | undefined {
  const m = html.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i"));
  return m?.[1]?.trim();
}

/** Telusuri satu node JSON-LD (bisa `Product` langsung, atau `ItemList`/
 * `@graph`/`mainEntity` yang membungkus banyak `Product`) — dipakai
 * rekursif karena struktur JSON-LD situs e-commerce bervariasi. */
function collectJsonLdProducts(
  node: unknown,
  out: ExternalProductCandidate[],
  pageUrl: string,
  depth = 0
): void {
  if (!node || typeof node !== "object" || depth > 4) return;
  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  const isProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"));

  if (isProduct && typeof obj.name === "string" && obj.name.trim()) {
    const imageField = obj.image;
    const images: string[] = Array.isArray(imageField)
      ? imageField.filter((i): i is string => typeof i === "string")
      : typeof imageField === "string"
        ? [imageField]
        : [];
    const offersField = obj.offers;
    const offer = Array.isArray(offersField) ? offersField[0] : offersField;
    const offerObj = offer && typeof offer === "object" ? (offer as Record<string, unknown>) : undefined;
    const price = parsePriceString(offerObj?.price as string | number | undefined);
    const sku = typeof obj.sku === "string" ? obj.sku : undefined;
    const productUrl = typeof obj.url === "string" ? obj.url : undefined;
    const catatan = typeof obj.description === "string" ? obj.description.trim() : undefined;
    const category = typeof obj.category === "string" ? obj.category.trim() : undefined;
    const availability =
      typeof offerObj?.availability === "string" ? (offerObj.availability as string) : undefined;

    out.push({
      // `sku` di sini cuma dipakai sebagai bagian dari kunci upsert
      // (`externalRef`) kalau produk tidak punya URL sendiri — BUKAN
      // dipasang ke kolom SKU produk (lihat komentar `ExternalProductCandidate`
      // di types.ts), supaya SKU yang tampil di Katalog Produk selalu format
      // ringkas buatan aplikasi sendiri.
      externalRef: sku || productUrl || `${pageUrl}#${out.length}`,
      name: obj.name.trim(),
      price,
      catatan: catatan || undefined,
      category: category || undefined,
      stockStatus: normalizeAvailability(availability),
      photoUrls: images.map((i) => absoluteUrl(i, pageUrl)),
    });
  }

  const nestedCandidates = [obj.mainEntity, obj["@graph"], obj.itemListElement, obj.item];
  for (const nested of nestedCandidates) {
    if (Array.isArray(nested)) {
      for (const child of nested) collectJsonLdProducts(child, out, pageUrl, depth + 1);
    } else if (nested) {
      collectJsonLdProducts(nested, out, pageUrl, depth + 1);
    }
  }
}

/**
 * Ambil data produk dari SATU halaman website publik — coba JSON-LD
 * (`<script type="application/ld+json">` schema.org `Product`) dulu, yang
 * dipakai kebanyakan platform e-commerce (Shopify, WooCommerce, dsb) untuk
 * SEO. Kalau tidak ketemu, jatuh ke meta tag OpenGraph (`og:title`,
 * `og:image`) sebagai perkiraan kasar — lebih baik daripada gagal total,
 * tapi hasilnya cuma satu produk dengan info seadanya, jadi selalu ditandai
 * di `warnings` supaya admin sadar perlu dicek manual sebelum disimpan.
 */
async function fetchWebsiteCandidates(pageUrl: string): Promise<ImportPreviewResult> {
  if (!isSafeExternalUrl(pageUrl)) {
    return { ok: false, error: "URL tidak valid atau menunjuk ke alamat yang tidak diizinkan." };
  }

  let res: Response;
  try {
    res = await fetch(pageUrl, { redirect: "follow", signal: AbortSignal.timeout(15000) });
  } catch {
    return { ok: false, error: "Gagal mengambil halaman — pastikan URL benar dan situsnya bisa diakses." };
  }
  if (!res.ok) {
    return { ok: false, error: `Situs merespons HTTP ${res.status}.` };
  }
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return { ok: false, error: "URL ini bukan halaman HTML (mungkin API atau file gambar/PDF)." };
  }

  const html = await res.text();
  if (html.length > MAX_HTML_BYTES) {
    return { ok: false, error: "Halaman terlalu besar untuk diproses." };
  }

  const candidates: ExternalProductCandidate[] = [];
  const warnings: string[] = [];

  const ldMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of ldMatches) {
    try {
      const json = JSON.parse(m[1].trim());
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) collectJsonLdProducts(item, candidates, pageUrl);
    } catch {
      // Blok JSON-LD yang tidak valid dilewati saja — bukan fatal, mungkin
      // ada blok JSON-LD lain di halaman yang sama yang valid.
    }
  }

  if (candidates.length === 0) {
    const name = matchMeta(html, "og:title") || matchTag(html, "title");
    const image = matchMeta(html, "og:image");
    const price = parsePriceString(matchMeta(html, "product:price:amount"));
    const description = matchMeta(html, "og:description") || matchMeta(html, "description");
    if (name) {
      candidates.push({
        externalRef: pageUrl,
        name: name.trim(),
        price,
        catatan: description?.trim() || undefined,
        photoUrls: image ? [absoluteUrl(image, pageUrl)] : [],
      });
      warnings.push(
        'Tidak ditemukan data produk terstruktur (JSON-LD "Product") di halaman ini — dipakai info dasar dari meta tag, kemungkinan kurang lengkap. Cek & lengkapi manual setelah diimpor.'
      );
    } else {
      return { ok: false, error: "Tidak ditemukan data produk yang bisa dikenali di halaman ini." };
    }
  }

  return { ok: true, candidates, warnings };
}

export async function previewImportSource(sourceId: string): Promise<ImportPreviewResult> {
  const supabase = await createClient();
  const { data: source, error } = await supabase
    .from("product_import_sources")
    .select("type, reference")
    .eq("id", sourceId)
    .maybeSingle();

  if (error || !source) {
    return { ok: false, error: "Sumber impor tidak ditemukan." };
  }

  return source.type === "whatsapp_catalog"
    ? fetchWhatsappCatalogCandidates(source.reference)
    : fetchWebsiteCandidates(source.reference);
}

// ---------------------------------------------------------------------
// Commit (simpan hasil yang sudah direview admin)
// ---------------------------------------------------------------------

/**
 * Simpan kandidat yang DIPILIH admin di layar review — dipanggil dengan
 * data hasil `previewImportSource` yang sama (dikirim balik dari client,
 * bukan fetch ulang) supaya apa yang disimpan PERSIS sama dengan apa yang
 * admin lihat & centang di layar preview.
 *
 * Upsert berdasarkan (`external_source`, `external_ref`) — bukan SKU —
 * supaya sinkron berikutnya otomatis MEMPERBARUI produk yang sama
 * (bukan bikin duplikat), sekalipun SKU-nya kosong/berubah. Foto dari
 * sumber ini (`source` sesuai jenis) DIGANTI TOTAL tiap sinkron (hapus
 * baris lama dari sumber ini, insert yang baru) — foto yang admin upload
 * manual (`source: "upload"`) TIDAK disentuh sama sekali.
 */
export async function commitImportCandidates(
  sourceId: string,
  type: ImportSourceType,
  candidates: ExternalProductCandidate[],
  selectedRefs: string[]
): Promise<{ ok: true; summary: ImportSummary } | { ok: false; error: string }> {
  const supabase = await createClient();
  const selected = new Set(selectedRefs);
  const toImport = candidates.filter((c) => selected.has(c.externalRef));

  if (toImport.length === 0) {
    return { ok: false, error: "Tidak ada produk yang dipilih." };
  }

  const summary: ImportSummary = { inserted: 0, updated: 0, skipped: 0, errors: [] };
  const photoSource: ProductPhotoSource = type;
  const NEW_PRODUCT_DIVISION: ProductDivision = "umum";

  for (const candidate of toImport) {
    const { data: existing } = await supabase
      .from("products")
      .select("id, sku, division")
      .eq("external_source", type)
      .eq("external_ref", candidate.externalRef)
      .maybeSingle();

    // Tahap 29c: "keterangan keseluruhan" produk (bukan cuma nama/harga/foto)
    // ikut disesuaikan dengan sumbernya tiap sinkron — TAPI hanya field yang
    // memang berhasil terbaca dari sumber (`candidate.xxx` terisi) yang
    // ditimpa, supaya sinkron yang kebetulan gagal membaca satu field (mis.
    // situs sempat ganti struktur) tidak diam-diam mengosongkan data yang
    // sudah baik di database. Stok TIDAK ditebak jadi angka tertentu (mis.
    // sumbernya cuma bilang "tersedia", bukan jumlah pasti) — cuma ditimpa
    // ke 0 kalau sumber jelas-jelas bilang habis/dihentikan, sinyal negatif
    // yang aman ditindaklanjuti otomatis.
    const updatePayload: Record<string, unknown> = {
      name: candidate.name,
      external_source: type,
      external_ref: candidate.externalRef,
    };
    if (candidate.price !== undefined) updatePayload.price = candidate.price;
    if (candidate.catatan) updatePayload.catatan = candidate.catatan;
    if (candidate.category) updatePayload.category = candidate.category;
    if (candidate.stockStatus === "out_of_stock") updatePayload.stock = 0;

    let productId: string;
    if (existing) {
      // Produk lama belum punya SKU ringkas (mis. diimpor sebelum Tahap 29c)
      // — buatkan sekarang juga, sekalian dibereskan saat disinkron ulang.
      if (!existing.sku) {
        updatePayload.sku = await generateSku(supabase, existing.division as ProductDivision);
      }
      const { error } = await supabase.from("products").update(updatePayload).eq("id", existing.id);
      if (error) {
        summary.skipped++;
        summary.errors.push(`${candidate.name}: ${GENERIC_ERROR}`);
        continue;
      }
      productId = existing.id;
      summary.updated++;
    } else {
      const insertPayload = {
        name: candidate.name,
        price: candidate.price ?? 0,
        external_source: type,
        external_ref: candidate.externalRef,
        division: NEW_PRODUCT_DIVISION,
        category: candidate.category || "",
        unit: "unit",
        stock: 0,
        catatan: candidate.catatan || null,
      };

      let inserted: { id: string } | null = null;
      let insertError: { code?: string; message?: string } | null = null;
      for (let attempt = 0; attempt < 2 && !inserted; attempt++) {
        const sku = await generateSku(supabase, NEW_PRODUCT_DIVISION);
        const result = await supabase.from("products").insert({ ...insertPayload, sku }).select("id").single();
        if (result.data) {
          inserted = result.data;
          insertError = null;
        } else {
          insertError = result.error;
          if (!isSkuConflict(result.error)) break;
        }
      }

      if (!inserted) {
        console.error("[products] commitImportCandidates insert gagal:", insertError?.message);
        summary.skipped++;
        summary.errors.push(`${candidate.name}: ${GENERIC_ERROR}`);
        continue;
      }
      productId = inserted.id;
      summary.inserted++;
    }

    // Ganti total foto dari SUMBER INI saja — foto manual ("upload") atau
    // dari sumber lain tidak disentuh.
    await supabase
      .from("product_photos")
      .delete()
      .eq("product_id", productId)
      .eq("source", photoSource);

    if (candidate.photoUrls.length > 0) {
      await supabase.from("product_photos").insert(
        candidate.photoUrls.map((url, i) => ({
          product_id: productId,
          photo_url: url,
          storage_path: null,
          source: photoSource,
          sort_order: i,
        }))
      );
    }

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

  await supabase
    .from("product_import_sources")
    .update({ last_synced_at: new Date().toISOString(), last_sync_summary: summary })
    .eq("id", sourceId);

  revalidateProductPaths();
  if (summary.inserted > 0 || summary.updated > 0) {
    void logActivity({
      module: "admin",
      action: "update",
      entityType: "produk",
      entityLabel: type === "whatsapp_catalog" ? "Impor dari WhatsApp Catalog" : "Impor dari website",
      detail: `${summary.inserted} baru, ${summary.updated} diperbarui, ${summary.skipped} dilewati`,
    });
  }

  return { ok: true, summary };
}
