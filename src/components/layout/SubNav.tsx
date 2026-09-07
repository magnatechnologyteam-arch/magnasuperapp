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
 */
export function SubNav({ items }: { items: SubNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4 md:px-8">
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors",
              isActive ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
            )}
          >
            {item.label}
            <span
              className={cn(
                "absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-slate-900 transition-opacity",
                isActive ? "opacity-100" : "opacity-0"
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
