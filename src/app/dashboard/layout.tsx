import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

/**
 * Layout portal — dipasang di `src/app/dashboard/layout.tsx`, BUKAN di root.
 * AppShell (Sidebar + MobileNav) hanya dirender untuk rute di dalam
 * `/dashboard/**`, sehingga root layout tetap bebas dipakai untuk halaman
 * publik (landing page, dsb.) tanpa ikut membawa chrome dashboard.
 *
 * Karena Next.js tidak me-remount layout saat berpindah antar rute anak,
 * shell ini tetap persist selama pengguna berpindah antar modul di dalam
 * dashboard — termasuk Sidebar, state-nya, dan scroll position-nya.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
