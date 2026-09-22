import { createClient } from "@/lib/supabase/server";
import { rowToGalleryFolder, type GalleryFolderRow, type GalleryPhotoRow } from "./extras-types";
import type { GalleryFolder } from "./extras-types";

/**
 * Query gabungan folder Galeri Kategori Alat + foto-fotonya — dipisah dari
 * `extras-actions.ts` (yang ber-"use server" dan semua export-nya wajib
 * fungsi async yang dipanggil sebagai Server Action) supaya query baca
 * biasa ini bisa langsung dipakai dari Server Component (halaman
 * Inventaris), sama pola dengan `getPortfolioFolders` di
 * `src/lib/magnative/portfolio-data.ts`.
 */
export async function getGalleryFolders(): Promise<GalleryFolder[]> {
  const supabase = await createClient();

  const [foldersRes, photosRes] = await Promise.all([
    supabase
      .from("magnarent_gallery_folders")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<GalleryFolderRow[]>(),
    supabase
      .from("magnarent_gallery_photos")
      .select("*")
      .order("position", { ascending: true })
      .returns<GalleryPhotoRow[]>(),
  ]);

  if (foldersRes.error) console.error("[magnarent] Gagal memuat folder galeri kategori:", foldersRes.error.message);
  if (photosRes.error) console.error("[magnarent] Gagal memuat foto galeri kategori:", photosRes.error.message);

  const photosByFolder = new Map<string, GalleryPhotoRow[]>();
  for (const row of photosRes.data ?? []) {
    const list = photosByFolder.get(row.folder_id) ?? [];
    list.push(row);
    photosByFolder.set(row.folder_id, list);
  }

  return (foldersRes.data ?? []).map((row) => rowToGalleryFolder(row, photosByFolder.get(row.id) ?? []));
}
