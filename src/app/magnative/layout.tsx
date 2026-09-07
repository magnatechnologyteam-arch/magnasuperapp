import type { ReactNode } from "react";
import { SubNav } from "@/components/layout/SubNav";
import { MODULES } from "@/lib/navigation";

const subnav = MODULES.find((mod) => mod.id === "magnative")!.subnav;

/**
 * Layout modul Magnative — dirender sekali dan tetap berada di pohon rute
 * selama pengguna berada di dalam /magnative/**. SubNav di sini TIDAK
 * remount saat pindah antar tab (Ringkasan, Sosial Media, Klien, Proyek).
 */
export default function MagnativeLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <SubNav items={subnav} />
      <div className="p-4 md:p-8">{children}</div>
    </div>
  );
}
