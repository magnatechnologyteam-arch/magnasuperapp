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
    <div className="flex items-center gap-2 overflow-x-auto border-b border-black/5 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-950 md:hidden">
      <Link
        href={HUB_HREF}
        className={cn(
          "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors",
          pathname === HUB_HREF
            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
            : "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"
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
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-transform active:scale-95",
              isActive
                ? "text-white shadow-sm"
                : "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"
            )}
            style={isActive ? { background: mod.gradient } : undefined}
          >
            {mod.label}
          </Link>
        );
      })}
    </div>
  );
}
