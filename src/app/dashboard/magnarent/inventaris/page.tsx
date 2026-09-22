import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { InventoryManager } from "@/components/magnarent/InventoryManager";
import { GalleryManager } from "@/components/magnarent/GalleryManager";
import { getGalleryFolders } from "@/lib/magnarent/gallery-data";

/**
 * Galeri Kategori Alat sekarang mengambil folder (album) sungguhan dari
 * `magnarent_gallery_folders` + `magnarent_gallery_photos`, menggantikan
 * `PlaceholderGallery` statis yang lama (lihat riwayat git untuk versi
 * dummy-nya). Staf bisa menambah/mengedit/menghapus kategori & foto
 * langsung lewat `GalleryManager` (lihat komponen itu untuk detail upload
 * ke Supabase Storage) — pola sama persis dengan `PortfolioGallery` di
 * Magnativ.
 */
export default async function MagnarentInventarisPage() {
  const galleryFolders = await getGalleryFolders();

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Inventaris"
        description="Katalog item rental, kategori, dan stok per lokasi."
      />
      <InventoryManager />
      <GalleryManager folders={galleryFolders} />
    </div>
  );
}
