import type { ReactNode } from "react";
import { SubNav } from "@/components/layout/SubNav";
import { MODULES } from "@/lib/navigation";

const subnav = MODULES.find((mod) => mod.id === "production")!.subnav;

export default function ProductionLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <SubNav items={subnav} />
      <div className="p-4 md:p-8">{children}</div>
    </div>
  );
}
