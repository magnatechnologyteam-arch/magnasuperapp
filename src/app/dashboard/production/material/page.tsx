import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { MaterialManager } from "@/components/production/MaterialManager";

export default function ProductionMaterialPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Gudang & Material"
        description="Stok material & peralatan produksi di gudang."
      />
      <MaterialManager />
    </div>
  );
}
