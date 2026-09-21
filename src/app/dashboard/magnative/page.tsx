import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { MagnativeOverview } from "@/components/magnative/MagnativeOverview";
import { PortfolioGallery } from "@/components/magnative/PortfolioGallery";
import { getPortfolioFolders } from "@/lib/magnative/portfolio-data";

/**
 * Halaman Ringkasan Magnativ — galeri portofolio sekarang mengambil folder
 * (album) sungguhan dari `magnative_portfolio_folders` + `magnative_portfolio`
 * (migrasi 0012, direstrukturisasi jadi model folder/album migrasi 0057),
 * menggantikan PlaceholderGallery statis yang lama. Staf bisa menambah/
 * mengedit/menghapus folder & foto langsung lewat `PortfolioGallery` (lihat
 * komponen itu untuk detail upload ke Supabase Storage) — query gabungan
 * folder+foto dipusatkan di `getPortfolioFolders` (`portfolio-data.ts`)
 * supaya widget Dashboard Hub bisa memakai data yang sama persis.
 */
export default async function MagnativeOverviewPage() {
  const folders = await getPortfolioFolders();

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Ringkasan Magnativ"
        description="Klien aktif, proyek berjalan, dan konten yang akan datang."
      />
      <MagnativeOverview />
      <PortfolioGallery folders={folders} />
    </div>
  );
}
