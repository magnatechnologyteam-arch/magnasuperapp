import type { ReactNode } from "react";
import { SubNav } from "@/components/layout/SubNav";
import { MODULES } from "@/lib/navigation";
import { ProductionDataProvider } from "@/components/production/ProductionDataProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";

const mod = MODULES.find((m) => m.id === "production")!;

/**
 * Layout modul Production — dirender sekali dan tetap berada di pohon rute
 * selama pengguna berada di dalam /dashboard/production/**. SubNav dan
 * `ProductionDataProvider` di sini TIDAK remount saat pindah antar tab
 * (Ringkasan, Material, Proyek Booth, Jadwal) — data material/proyek booth
 * tetap hidup selama pengguna berada di dalam modul, pola yang sama dengan
 * Magnarent dan Magnative.
 */
export default function ProductionLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ProductionDataProvider>
        <div>
          <SubNav items={mod.subnav} gradient={mod.gradient} />
          <div className="p-4 md:p-8">{children}</div>
        </div>
      </ProductionDataProvider>
    </ToastProvider>
  );
}
