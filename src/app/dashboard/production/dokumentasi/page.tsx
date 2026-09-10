import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { DocumentationGallery } from "@/components/production/DocumentationGallery";
import { createClient } from "@/lib/supabase/server";
import { rowToProjectPhoto, type ProjectPhotoRow } from "@/lib/production/extras-types";

/**
 * Halaman Dokumentasi (Tahap 28c) — pengganti `PlaceholderGallery` statis
 * yang sebelumnya nangkring di halaman Proyek Booth (lihat riwayat git
 * `proyek/page.tsx`). Nama proyek untuk badge & dropdown "Tambah Foto"
 * diambil `DocumentationGallery` langsung dari `ProductionDataProvider`
 * (sudah dimuat di layout), jadi di sini cukup fetch foto-fotonya saja.
 */
export default async function ProductionDokumentasiPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_project_photos")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<ProjectPhotoRow[]>();

  if (error) console.error("[production] Gagal memuat dokumentasi proyek:", error.message);
  const photos = (data ?? []).map(rowToProjectPhoto);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Dokumentasi"
        description="Galeri foto sebelum/sesudah instalasi booth, per proyek."
      />
      <DocumentationGallery photos={photos} />
    </div>
  );
}
