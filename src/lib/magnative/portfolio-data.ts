import { createClient } from "@/lib/supabase/server";
import { rowToPortfolioFolder, type PortfolioFolderRow, type PortfolioPhotoRow } from "./mappers";
import type { PortfolioFolder } from "./types";

/**
 * Query gabungan folder portofolio + foto-fotonya (migrasi 0057) — dipisah
 * ke sini (bukan `actions.ts`, yang ber-"use server" dan semua export-nya
 * wajib fungsi yang dipanggil sebagai Server Action), mengikuti pola
 * `getProductsWithPhotos` di `src/lib/products/data.ts`, supaya query baca
 * biasa ini bisa langsung dipakai dari Server Component mana pun — baik
 * halaman Ringkasan Magnativ maupun widget Dashboard Hub (Update Opsional
 * 1 butir 5: portofolio harus tampil lintas divisi di Hub, bukan cuma di
 * halaman Magnativ).
 */
export async function getPortfolioFolders(): Promise<PortfolioFolder[]> {
  const supabase = await createClient();

  const [foldersRes, photosRes] = await Promise.all([
    supabase
      .from("magnative_portfolio_folders")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<PortfolioFolderRow[]>(),
    supabase
      .from("magnative_portfolio")
      .select("*")
      .order("position", { ascending: true })
      .returns<PortfolioPhotoRow[]>(),
  ]);

  if (foldersRes.error) console.error("[magnative] Gagal memuat folder portofolio:", foldersRes.error.message);
  if (photosRes.error) console.error("[magnative] Gagal memuat foto portofolio:", photosRes.error.message);

  const photosByFolder = new Map<string, PortfolioPhotoRow[]>();
  for (const row of photosRes.data ?? []) {
    const list = photosByFolder.get(row.folder_id) ?? [];
    list.push(row);
    photosByFolder.set(row.folder_id, list);
  }

  return (foldersRes.data ?? []).map((row) => rowToPortfolioFolder(row, photosByFolder.get(row.id) ?? []));
}
