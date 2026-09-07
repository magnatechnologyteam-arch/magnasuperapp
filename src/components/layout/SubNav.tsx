"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SubNavItem } from "@/lib/navigation";
import { cn } from "@/lib/cn";

/**
 * Sub-navigation bar generik yang dipakai ulang oleh setiap layout modul
 * (Magnative, Magnarent, Production). Karena dirender di layout.tsx modul,
 * komponen ini TIDAK remount saat berpindah antar sub-halaman modul yang sama
 * — hanya konten `page.tsx` di bawahnya yang berganti.
 *
 * `gradient` datang dari konfigurasi modul (src/lib/navigation.ts) supaya tab
 * aktif memakai warna identitas modul yang sedang dibuka.
 */
export function SubNav({ items, gradient }: { items: SubNavItem[]; gradient: string }) {
  const pathname = usePathname();

  return (
    <nav className="border-b border-black/5 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-950 md:px-8">
      <div className="inline-flex gap-1 rounded-full bg-zinc-100 p-1 dark:bg-white/5">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-all",
                isActive
                  ? "text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white"
              )}
              style={isActive ? { background: gradient } : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
