import type { ReactNode } from "react";
import { SubNav } from "@/components/layout/SubNav";
import { MODULES } from "@/lib/navigation";

const mod = MODULES.find((m) => m.id === "magnative")!;

/**
 * Layout modul Magnative — dirender sekali dan tetap berada di pohon rute
 * selama pengguna berada di dalam /magnative/**. SubNav di sini TIDAK
 * remount saat pindah antar tab (Ringkasan, Sosial Media, Klien, Proyek).
 */
export default function MagnativeLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <SubNav items={mod.subnav} gradient={mod.gradient} />
      <div className="p-4 md:p-8">{children}</div>
    </div>
  );
}
