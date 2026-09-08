import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/lib/supabase/server";

/**
 * Layout portal — dipasang di `src/app/dashboard/layout.tsx`, BUKAN di root.
 * AppShell (Sidebar + Topbar + MobileNav) hanya dirender untuk rute di
 * dalam `/dashboard/**`, sehingga root layout tetap bebas dipakai untuk
 * halaman publik (/login, /register) tanpa ikut membawa chrome dashboard.
 *
 * Layout ini async: mengambil user + profil dari Supabase di server
 * (middleware sudah memastikan hanya pengguna yang login yang bisa sampai
 * ke sini) lalu meneruskannya ke Topbar lewat AppShell. Karena Next.js
 * tidak me-remount layout saat berpindah antar rute anak, shell ini tetap
 * persist selama pengguna berpindah antar modul di dalam dashboard —
 * termasuk Sidebar, Topbar, state-nya, dan scroll position-nya.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();
  return <AppShell user={profile}>{children}</AppShell>;
}
