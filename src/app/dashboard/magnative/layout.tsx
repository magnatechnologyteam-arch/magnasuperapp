import type { ReactNode } from "react";
import { SubNav } from "@/components/layout/SubNav";
import { MODULES } from "@/lib/navigation";
import { MagnativeDataProvider } from "@/components/magnative/MagnativeDataProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";

const mod = MODULES.find((m) => m.id === "magnative")!;

/**
 * Layout modul Magnative — dirender sekali dan tetap berada di pohon rute
 * selama pengguna berada di dalam /dashboard/magnative/**. SubNav di sini
 * TIDAK remount saat pindah antar tab (Ringkasan, Sosial Media, Klien,
 * Proyek), dan begitu juga `MagnativeDataProvider` — data klien/proyek/
 * konten tetap hidup selama pengguna berada di dalam modul, pola yang
 * sama dengan Magnarent.
 */
export default function MagnativeLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <MagnativeDataProvider>
        <div>
          <SubNav items={mod.subnav} gradient={mod.gradient} />
          <div className="p-4 md:p-8">{children}</div>
        </div>
      </MagnativeDataProvider>
    </ToastProvider>
  );
}
