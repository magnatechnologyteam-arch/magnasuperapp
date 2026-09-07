import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { ProductionSchedule } from "@/components/production/ProductionSchedule";

export default function ProductionJadwalPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Jadwal Produksi"
        description="Linimasa pengerjaan booth dari desain hingga instalasi."
      />
      <ProductionSchedule />
    </div>
  );
}
