import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { CreativeAssetGallery } from "@/components/magnative/CreativeAssetGallery";
import { createClient } from "@/lib/supabase/server";
import { rowToCreativeAsset, type CreativeAssetRow } from "@/lib/magnative/mappers";

/**
 * Halaman Aset Kreatif (Tahap 28b) — perpustakaan kerja internal tim
 * (template, foto mentah, video, file desain). BEDA dari galeri
 * "Portofolio" di halaman Ringkasan (showcase hasil jadi untuk klien).
 */
export default async function MagnativeCreativeAssetsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("magnative_creative_assets")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<CreativeAssetRow[]>();

  if (error) console.error("[magnative] Gagal memuat aset kreatif:", error.message);
  const assets = (data ?? []).map(rowToCreativeAsset);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Aset Kreatif"
        description="Perpustakaan kerja tim — template, foto mentah, video, file desain."
      />
      <CreativeAssetGallery assets={assets} />
    </div>
  );
}
