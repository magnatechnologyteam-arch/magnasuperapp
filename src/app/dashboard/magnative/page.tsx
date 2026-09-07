import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { MagnativeOverview } from "@/components/magnative/MagnativeOverview";

export default function MagnativeOverviewPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Ringkasan Magnative"
        description="Klien aktif, proyek berjalan, dan konten yang akan datang."
      />
      <MagnativeOverview />
    </div>
  );
}
