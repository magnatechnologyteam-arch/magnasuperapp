import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

/**
 * Shell tingkat aplikasi: dipasang SEKALI di app/layout.tsx (root).
 * Sidebar + MobileNav ada di luar {children}, sehingga tetap persist
 * di seluruh pohon rute — pindah modul atau pindah sub-halaman apa pun
 * tidak pernah membongkar ulang shell ini.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
