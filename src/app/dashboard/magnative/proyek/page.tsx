import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { ProjectManager } from "@/components/magnative/ProjectManager";

export default function MagnativeProyekPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Proyek"
        description="Timeline & status proyek event yang sedang berjalan."
      />
      <ProjectManager />
    </div>
  );
}
