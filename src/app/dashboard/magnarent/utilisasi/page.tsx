import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { UtilizationReport } from "@/components/magnarent/UtilizationReport";

export default function MagnarentUtilisasiPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Perputaran Alat"
        description="Alat mana yang paling sering berputar, dan mana yang jadi kandidat dilepas karena diam terlalu lama."
      />
      <UtilizationReport />
    </div>
  );
}
