import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { MaterialReuseReport } from "@/components/production/MaterialReuseReport";

export default function ProductionPemakaianPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Pemakaian Material"
        description="Material mana yang paling sering dipakai ulang lintas proyek booth, dan mana yang belum pernah tersentuh."
      />
      <MaterialReuseReport />
    </div>
  );
}
