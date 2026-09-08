import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { MagnativeOverview } from "@/components/magnative/MagnativeOverview";
import { PortfolioGallery } from "@/components/magnative/PortfolioGallery";
import { createClient } from "@/lib/supabase/server";
import { rowToPortfolioPhoto, type PortfolioPhotoRow } from "@/lib/magnative/mappers";

/**
 * Halaman Ringkasan Magnativ — galeri portofolio sekarang mengambil foto
 * sungguhan dari tabel `magnative_portfolio` (migrasi 0012), menggantikan
 * PlaceholderGallery statis yang lama. Staf bisa menambah/mengedit/menghapus
 * foto langsung lewat `PortfolioGallery` (lihat komponen itu untuk detail
 * upload ke Supabase Storage).
 */
export default async function MagnativeOverviewPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("magnative_portfolio")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<PortfolioPhotoRow[]>();

  if (error) console.error("[magnative] Gagal memuat portofolio:", error.message);
  const photos = (data ?? []).map(rowToPortfolioPhoto);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Ringkasan Magnativ"
        description="Klien aktif, proyek berjalan, dan konten yang akan datang."
      />
      <MagnativeOverview />
      <PortfolioGallery photos={photos} />
    </div>
  );
}
