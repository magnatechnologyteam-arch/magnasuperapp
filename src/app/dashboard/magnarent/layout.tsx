import type { ReactNode } from "react";
import { SubNav } from "@/components/layout/SubNav";
import { MODULES } from "@/lib/navigation";
import { MagnarentDataProvider } from "@/components/magnarent/MagnarentDataProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";

const mod = MODULES.find((m) => m.id === "magnarent")!;

/**
 * Layout modul Magnarent — selain SubNav, layout ini juga memasang
 * `MagnarentDataProvider` dan `ToastProvider` SEKALI di sini. Karena Next.js
 * tidak me-remount layout saat berpindah antar sub-rute (Ringkasan/
 * Inventaris/Kalender/Booking), data inventaris & booking yang disimpan
 * lewat React state di provider ini tetap hidup selama pengguna berada di
 * dalam modul — menambah alat di tab Inventaris langsung terlihat saat
 * pindah ke tab Booking, tanpa reload atau kembali ke Hub.
 */
export default function MagnarentLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <MagnarentDataProvider>
        <div>
          <SubNav items={mod.subnav} gradient={mod.gradient} />
          <div className="p-4 md:p-8">{children}</div>
        </div>
      </MagnarentDataProvider>
    </ToastProvider>
  );
}
