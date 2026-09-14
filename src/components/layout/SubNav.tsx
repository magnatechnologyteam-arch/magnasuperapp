"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SubNavItem } from "@/lib/navigation";
import { cn } from "@/lib/cn";
import { GLASS_BORDER, GLASS_PILL, GLASS_SURFACE } from "@/lib/glass";

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
    // Tahap 34: `overflow-x-auto` di <nav> ini (bukan cuma di div pil-nya)
    // WAJIB ada — sebelumnya baris pil (7 item di Production/Magnative)
    // tidak punya kontainer scroll sendiri di layar sempit, jadi malah
    // meluber ke luar <nav> dan bikin SELURUH HALAMAN bisa discroll ke
    // samping (banner status & konten lain ikut kegeser/terpotong kalau
    // pengguna tanpa sengaja scroll horizontal). Sekarang overflow-nya
    // ditahan DI SINI saja, jadi cuma baris tab ini yang bisa discroll
    // ke samping, bukan seluruh body.
    <nav
      className={cn(
        "overflow-x-auto overscroll-x-contain border-b px-4 py-3 md:px-8",
        GLASS_SURFACE,
        GLASS_BORDER
      )}
    >
      <div className={cn("inline-flex w-max gap-1 rounded-full border p-1", GLASS_PILL)}>
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
