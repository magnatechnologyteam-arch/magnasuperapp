"use client";

import { usePathname } from "next/navigation";
import { getModuleByPath } from "@/lib/navigation";

/**
 * Judul halaman dalam modul — otomatis mengambil ikon & warna aksen modul
 * yang sedang aktif lewat pathname, jadi tiap page.tsx tidak perlu tahu/
 * mengirim gradient-nya sendiri (single source of truth tetap di
 * navigation.ts). Badge ikon di sini dipakai konsisten di SEMUA halaman
 * setiap modul (bukan cuma Ringkasan) supaya identitas modul terasa di
 * mana pun pengguna berada — label modul di atas judul (eyebrow) & halo
 * warna di belakang ikon jadi pembeda kecil supaya tidak melulu terasa
 * satu pola yang sama persis di tiap halaman.
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
    <div className="animate-fade-up flex items-start gap-4">
      {Icon && (
        <div className="relative shrink-0">
          <span
            className="absolute -inset-1.5 animate-pulse rounded-2xl opacity-30 blur-lg"
            style={{ background: mod.gradient }}
            aria-hidden
          />
          <div
            className="relative grid h-12 w-12 place-items-center rounded-2xl text-white shadow-sm"
            style={{ background: mod.gradient }}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      )}
      <div className="min-w-0">
        {mod && (
          <p
            className="text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{ color: mod.solid }}
          >
            {mod.label}
          </p>
        )}
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
      </div>
    </div>
  );
}
