import type { ReactNode } from "react";
import { SubNav } from "@/components/layout/SubNav";
import { MODULES } from "@/lib/navigation";

const mod = MODULES.find((m) => m.id === "production")!;

export default function ProductionLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <SubNav items={mod.subnav} gradient={mod.gradient} />
      <div className="p-4 md:p-8">{children}</div>
    </div>
  );
}
