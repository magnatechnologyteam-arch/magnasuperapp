import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { Topbar } from "./Topbar";
import type { Profile } from "@/lib/supabase/types";

/**
 * Shell tingkat aplikasi: dipasang SEKALI di app/dashboard/layout.tsx.
 * Sidebar + Topbar + MobileNav ada di luar {children}, sehingga tetap
 * persist di seluruh pohon rute — pindah modul atau pindah sub-halaman
 * apa pun tidak pernah membongkar ulang shell ini.
 *
 * `user` diambil server-side (Supabase session + profiles table) di
 * dashboard/layout.tsx dan diteruskan turun ke Topbar untuk ditampilkan.
 */
export function AppShell({
  children,
  user,
}: {
  children: ReactNode;
  user: (Profile & { email: string }) | null;
}) {
  return (
    <div className="app-backdrop flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar division={user?.division} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <MobileNav division={user?.division} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
