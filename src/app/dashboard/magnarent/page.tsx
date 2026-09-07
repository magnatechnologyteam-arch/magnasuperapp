import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { MagnarentOverview } from "@/components/magnarent/MagnarentOverview";

export default function MagnarentOverviewPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Ringkasan Magnarent"
        description="Okupansi, item populer, dan booking yang akan datang."
      />
      <MagnarentOverview />
    </div>
  );
}
