import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { NcCapaManager } from "@/components/production/NcCapaManager";
import { getNcReports, getVendors } from "@/lib/production/extras-actions";

/**
 * Halaman Modul NC/CAPA (non-conformance & tindakan korektif/preventif --
 * analisis-kompetitor #23). SENGAJA dipisah dari halaman Proyek Booth
 * (checklist instalasi/bongkar yang sudah ada) -- ini fokus mencatat
 * TEMUAN ketidaksesuaian kualitas & tindak lanjutnya, plus ringkasan
 * riwayat kualitas per vendor/PIC dari waktu ke waktu.
 */
export default async function ProductionKualitasPage() {
  const [ncReports, vendors] = await Promise.all([getNcReports(), getVendors()]);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="NC/CAPA — Kualitas"
        description="Catat temuan ketidaksesuaian (non-conformance) & tindakan korektif/preventif, terpisah dari checklist instalasi rutin."
      />
      <NcCapaManager ncReports={ncReports} vendors={vendors} />
    </div>
  );
}
