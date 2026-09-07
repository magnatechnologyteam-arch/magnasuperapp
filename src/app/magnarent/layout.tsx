import type { ReactNode } from "react";
import { SubNav } from "@/components/layout/SubNav";
import { MODULES } from "@/lib/navigation";

const subnav = MODULES.find((mod) => mod.id === "magnarent")!.subnav;

export default function MagnarentLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <SubNav items={subnav} />
      <div className="p-4 md:p-8">{children}</div>
    </div>
  );
}
