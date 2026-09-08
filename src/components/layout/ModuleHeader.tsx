"use client";

import { usePathname } from "next/navigation";
import { getModuleByPath } from "@/lib/navigation";

/**
 * Judul halaman dalam modul — otomatis mengambil ikon & warna aksen modul
 * yang sedang aktif lewat pathname, jadi tiap page.tsx tidak perlu tahu/
 * mengirim gradient-nya sendiri (single source of truth tetap di
 * navigation.ts). Badge ikon di sini dipakai konsisten di SEMUA halaman
 * setiap modul (bukan cuma Ringkasan) supaya identitas modul terasa di
 * mana pun pengguna berada.
 */
export function ModuleHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  const pathname = usePathname();
  const mod = getModuleByPath(pathname);
  const Icon = mod?.icon;

  return (
    <div className="flex items-start gap-4">
      {Icon && (
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-sm"
          style={{ background: mod.gradient }}
        >
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
      </div>
    </div>
  );
}
