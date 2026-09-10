import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { BoothProjectManager } from "@/components/production/BoothProjectManager";

export default function ProductionProyekPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Proyek Booth"
        description="Tracking proyek booth per klien, dari desain hingga instalasi. Klik ikon folder di tiap baris untuk checklist instalasi/bongkar & kru — dokumentasi foto sebelum/sesudah ada di tab Dokumentasi."
      />
      <BoothProjectManager />
    </div>
  );
}
