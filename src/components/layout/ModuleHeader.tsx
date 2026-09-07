"use client";

import { usePathname } from "next/navigation";
import { getModuleByPath } from "@/lib/navigation";

/**
 * Judul halaman dalam modul — otomatis mengambil warna aksen modul yang
 * sedang aktif lewat pathname, jadi tiap page.tsx tidak perlu tahu/mengirim
 * gradient-nya sendiri (single source of truth tetap di navigation.ts).
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

  return (
    <div>
      {mod && (
        <div
          className="mb-3 h-1.5 w-10 rounded-full"
          style={{ background: mod.gradient }}
        />
      )}
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
        {title}
      </h1>
      {description && (
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      )}
    </div>
  );
}
