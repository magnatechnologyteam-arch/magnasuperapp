import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { BoothProjectManager } from "@/components/production/BoothProjectManager";
import { getBomTemplates } from "@/lib/production/extras-actions";

/**
 * Halaman Proyek Booth — sekarang async server component supaya bisa
 * fetch `getBomTemplates()` (Tahap 44) dan diteruskan ke
 * `BoothProjectManager` untuk fitur "Muat dari Template" di form
 * alokasi material. Template BOM dikelola terpisah di tab "Template BOM".
 */
export default async function ProductionProyekPage() {
  const templates = await getBomTemplates();

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Proyek Booth"
        description="Tracking proyek booth per klien, dari desain hingga instalasi. Klik ikon folder di tiap baris untuk checklist instalasi/bongkar & kru — dokumentasi foto sebelum/sesudah ada di tab Dokumentasi."
      />
      <BoothProjectManager templates={templates} />
    </div>
  );
}
