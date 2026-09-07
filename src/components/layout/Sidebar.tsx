"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { ACCENT_CLASSES, HUB_HREF, MODULES } from "@/lib/navigation";
import { cn } from "@/lib/cn";

/**
 * Sidebar global — dirender sekali di root layout, jadi tetap tampil
 * (dan tidak remount) saat berpindah antar modul maupun antar sub-halaman.
 * Inilah yang membuat pindah modul tidak perlu kembali ke Hub dulu.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-sm font-bold text-white">
          M
        </div>
        <span className="text-sm font-semibold tracking-tight text-slate-900">
          MagnaSuperApp
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <Link
          href={HUB_HREF}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === HUB_HREF
              ? "bg-slate-100 text-slate-900"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          <LayoutGrid className="h-4 w-4" />
          Dashboard Hub
        </Link>

        <div className="pt-4">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Modul
          </p>
          <ul className="space-y-1">
            {MODULES.map((mod) => {
              const isActive =
                pathname === mod.href || pathname.startsWith(`${mod.href}/`);
              const accent = ACCENT_CLASSES[mod.accent];
              const Icon = mod.icon;

              return (
                <li key={mod.id}>
                  <Link
                    href={mod.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? accent.active
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", isActive ? accent.icon : "text-slate-400")} />
                    {mod.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
