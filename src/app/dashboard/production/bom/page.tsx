import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { BomTemplateManager } from "@/components/production/BomTemplateManager";
import { getBomTemplates } from "@/lib/production/extras-actions";

/**
 * Halaman Template BOM per tipe booth (Tahap 44 — gap #2
 * analisis-gap-production.md). Template disimpan sebagai resep alokasi
 * material yang sering dipakai (mis. "Booth 3x3 Standar"), lalu "dimuat"
 * ke proyek baru lewat pilihan di form Proyek Booth — bukan diinput
 * manual dari nol tiap kali. Data template SENGAJA tidak ditaruh di
 * `ProductionDataProvider` (jarang dibuka dibanding material/proyek inti),
 * sama seperti pola halaman Alat &amp; Perkakas.
 */
export default async function ProductionBomPage() {
  const templates = await getBomTemplates();

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Template BOM"
        description="Resep alokasi material per tipe booth yang sering dipakai ulang — tinggal dimuat ke proyek baru lewat form Proyek Booth."
      />
      <BomTemplateManager templates={templates} />
    </div>
  );
}
