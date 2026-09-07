import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { ProductionOverview } from "@/components/production/ProductionOverview";

export default function ProductionOverviewPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Ringkasan Production"
        description="Status produksi booth & interior yang sedang berjalan."
      />
      <ProductionOverview />
    </div>
  );
}
