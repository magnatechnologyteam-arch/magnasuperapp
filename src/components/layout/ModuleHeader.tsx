"use client";

import { usePathname } from "next/navigation";
import { getModuleByPath } from "@/lib/navigation";

/**
 * Judul halaman dalam modul — otomatis mengambil logo & warna aksen modul
 * yang sedang aktif lewat pathname, jadi tiap page.tsx tidak perlu tahu/
 * mengirim logo/gradient-nya sendiri (single source of truth tetap di
 * navigation.ts). Badge di sini dipakai konsisten di SEMUA halaman setiap
 * modul (bukan cuma Ringkasan) supaya identitas divisi terasa di mana pun
 * pengguna berada.
 *
 * Tahap 31: badge diganti dari ikon Lucide generik di atas ubin gradient
 * jadi LOGO RESMI tiap divisi (Magnativ/Magnarent/Production) di atas ubin
 * putih — logo lockup-nya punya warna sendiri (teal/navy-merah/emas), jadi
 * ditaruh di ubin putih supaya warnanya kebaca bersih di mode terang MAUPUN
 * gelap, sementara halo blur warna-warni di belakangnya tetap pakai
 * `mod.gradient` untuk ambience. Modul yang belum punya `logo` (kalau ada
 * suatu saat) otomatis jatuh ke tampilan ikon lama.
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
      {mod && (
        <div className="relative shrink-0">
          <span
            className="absolute -inset-1.5 animate-pulse rounded-2xl opacity-30 blur-lg"
            style={{ background: mod.gradient }}
            aria-hidden
          />
          {mod.logo ? (
            <div className="relative flex h-12 min-w-[3rem] items-center justify-center rounded-2xl bg-white px-2 shadow-sm ring-1 ring-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element -- logo lokal statis, ukuran per-file beda-beda (lockup, bukan ikon kotak) jadi lebih sederhana pakai <img> daripada next/image */}
              <img src={mod.logo} alt={mod.label} className="h-7 w-auto max-w-[6.5rem] object-contain" />
            </div>
          ) : (
            Icon && (
              <div
                className="relative grid h-12 w-12 place-items-center rounded-2xl text-white shadow-sm"
                style={{ background: mod.gradient }}
              >
                <Icon className="h-6 w-6" />
              </div>
            )
          )}
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
