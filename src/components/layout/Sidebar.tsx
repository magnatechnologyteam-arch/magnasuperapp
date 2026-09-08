"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, History, LayoutGrid, Users, Users2, Wallet2 } from "lucide-react";
import { HUB_HREF, getVisibleModules } from "@/lib/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { cn } from "@/lib/cn";
import type { Division } from "@/lib/supabase/types";

/**
 * Sidebar global — dirender sekali di root layout, jadi tetap tampil
 * (dan tidak remount) saat berpindah antar modul maupun antar sub-halaman.
 * Inilah yang membuat pindah modul tidak perlu kembali ke Hub dulu.
 *
 * `division` menentukan modul mana yang ditampilkan (lihat getVisibleModules)
 * — staf satu bagian cuma melihat tautan ke modulnya sendiri, sementara
 * akses penuh ("all") melihat semuanya plus tautan ke halaman Admin
 * (Kelola Pengguna, Laporan, Aktivitas).
 */
const ADMIN_LINKS = [
  { href: "/dashboard/admin/pengguna", label: "Kelola Pengguna", icon: Users },
  { href: "/dashboard/admin/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/dashboard/admin/aktivitas", label: "Aktivitas", icon: History },
  { href: "/dashboard/admin/klien", label: "Klien Terpadu", icon: Users2 },
  { href: "/dashboard/admin/keuangan", label: "Piutang & Pendapatan", icon: Wallet2 },
  { href: "/dashboard/admin/produk", label: "Katalog Produk", icon: Boxes },
];

export function Sidebar({ division }: { division?: Division | null }) {
  const pathname = usePathname();
  const modules = getVisibleModules(division);
  const isFullAccess = division === "all";

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-black/5 bg-white dark:border-white/10 dark:bg-zinc-950 md:flex">
      <div className="flex h-16 items-center gap-3 border-b border-black/5 px-5 dark:border-white/10">
        <BrandLogo size={36} />
        <span className="text-[15px] font-bold tracking-tight text-zinc-900 dark:text-white">
          MagnaSuperApp
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <Link
          href={HUB_HREF}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
            pathname === HUB_HREF
              ? "bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-white"
              : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
          )}
        >
          <LayoutGrid className="h-[18px] w-[18px]" />
          Dashboard Hub
        </Link>

        <div className="pt-5">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Modul
          </p>
          <ul className="space-y-1">
            {modules.map((mod) => {
              const isActive =
                pathname === mod.href || pathname.startsWith(`${mod.href}/`);
              const Icon = mod.icon;

              return (
                <li key={mod.id}>
                  <Link
                    href={mod.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                      isActive
                        ? mod.soft
                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                    )}
                  >
                    <Icon
                      className="h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110"
                      style={isActive ? { color: mod.solid } : undefined}
                    />
                    {mod.label}
                    {isActive && (
                      <span
                        className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: mod.gradient }}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {isFullAccess && (
          <div className="pt-5">
            <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Admin
            </p>
            <ul className="space-y-1">
              {ADMIN_LINKS.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                        isActive
                          ? "bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-white"
                          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>
    </aside>
  );
}
