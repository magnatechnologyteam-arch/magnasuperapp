import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { ClientManager } from "@/components/magnative/ClientManager";

export default function MagnativeKlienPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Klien"
        description="Daftar klien EO & creative agency beserta status kerja sama."
      />
      <ClientManager />
    </div>
  );
}
