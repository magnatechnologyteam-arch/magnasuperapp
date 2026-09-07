"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HUB_HREF, MODULES } from "@/lib/navigation";
import { cn } from "@/lib/cn";

/**
 * Pengganti Sidebar di layar kecil: strip module switcher yang bisa discroll
 * horizontal, tetap tampil di semua halaman lewat root layout.
 */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-3 md:hidden">
      <Link
        href={HUB_HREF}
        className={cn(
          "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
          pathname === HUB_HREF
            ? "bg-slate-900 text-white"
            : "bg-slate-100 text-slate-600"
        )}
      >
        Hub
      </Link>
      {MODULES.map((mod) => {
        const isActive = pathname === mod.href || pathname.startsWith(`${mod.href}/`);
        return (
          <Link
            key={mod.id}
            href={mod.href}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
            )}
          >
            {mod.label}
          </Link>
        );
      })}
    </div>
  );
}
