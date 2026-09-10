import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { ContentRequestManager } from "@/components/magnative/ContentRequestManager";
import { createClient } from "@/lib/supabase/server";
import { rowToContentRequest, type ContentRequestRow } from "@/lib/magnative/mappers";

/**
 * Halaman Permintaan Konten (Tahap 28b) — antrean permintaan konten dari
 * klien SEBELUM jadi jadwal konten sungguhan di tab Sosial Media. Data
 * klien untuk dropdown/nama diambil `ContentRequestManager` langsung dari
 * `MagnativeDataProvider` (sudah dimuat di layout), jadi di sini cukup
 * fetch data permintaannya saja.
 */
export default async function MagnativeContentRequestsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("magnative_content_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<ContentRequestRow[]>();

  if (error) console.error("[magnative] Gagal memuat permintaan konten:", error.message);
  const requests = (data ?? []).map(rowToContentRequest);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Permintaan Konten"
        description="Antrean permintaan konten dari klien — tindak lanjuti sebelum dijadwalkan."
      />
      <ContentRequestManager requests={requests} />
    </div>
  );
}
