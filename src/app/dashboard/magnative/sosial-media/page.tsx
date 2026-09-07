import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { ContentPlanner } from "@/components/magnative/ContentPlanner";

export default function MagnativeSosialMediaPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Sosial Media"
        description="Kalender konten, jadwal posting, dan performa akun."
      />
      <ContentPlanner />
    </div>
  );
}
