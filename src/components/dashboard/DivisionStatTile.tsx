"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { GLASS_BORDER, GLASS_SURFACE_STRONG } from "@/lib/glass";
import { formatRupiah } from "@/lib/shared/utils";

/**
 * Tahap 46 (redesign "Liquid Glass" ala widget iOS — permintaan Owner):
 * `DivisionStatTile` mengelompokkan Ringkasan Cepat per DIVISI (satu
 * kartu kaca besar per divisi, isinya beberapa baris angka) alih-alih satu
 * grid rata berisi kartu-kartu kecil terpisah seperti sebelumnya. Susunan
 * ini meniru layout "bento/widget" ala Home Screen iPhone yang sudah
 * disepakati lewat mockup (lihat sesi diskusi UI), TAPI seluruh angkanya
 * tetap 100% dari `src/lib/dashboard/summary.ts` (Supabase asli) — tidak
 * ada progress ring atau persentase rekaan, karena sumber datanya memang
 * tidak punya angka "total" untuk dijadikan rasio yang jujur.
 *
 * Hitung naik dipertahankan dari `QuickStatCard` lama (Tahap 31) supaya
 * kartu tetap terasa hidup begitu Dashboard Hub selesai dimuat.
 */
function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

type DivisionStat = {
  label: string;
  value: number;
  hint: string;
  /** Elemen ikon sudah dirender (lihat catatan yang sama di QuickStatCard.tsx
   * soal kenapa ini ReactNode, bukan referensi komponen ikonnya). */
  icon: ReactNode;
  accent: string;
  href: string;
  warn?: boolean;
  formatAsRupiah?: boolean;
};

function StatRow({ stat }: { stat: DivisionStat }) {
  const animated = useCountUp(stat.value);

  return (
    <Link
      href={stat.href}
      className="group/stat relative -mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
    >
      {stat.warn && <span className="absolute inset-0 animate-pulse rounded-xl bg-rose-500/5" aria-hidden />}
      <div
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white transition-transform group-hover/stat:scale-110"
        style={{ background: stat.accent }}
      >
        {stat.icon}
      </div>
      <div className="relative min-w-0 flex-1">
        <p
          className={cn(
            "text-lg font-extrabold leading-none tabular-nums",
            stat.warn ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-white"
          )}
        >
          {stat.formatAsRupiah ? formatRupiah(animated) : animated}
        </p>
        <p className="mt-1 truncate text-xs font-semibold text-zinc-500 dark:text-zinc-400">{stat.label}</p>
        <p className="truncate text-[10.5px] text-zinc-400 dark:text-zinc-500">{stat.hint}</p>
      </div>
    </Link>
  );
}

export function DivisionStatTile({
  label,
  gradient,
  icon,
  stats,
  delayMs = 0,
}: {
  label: string;
  gradient: string;
  /** Ikon divisi (mis. `mod.icon`) sudah dirender jadi elemen — sama seperti
   * `icon` di StatRow, ini melintasi batas Server->Client Component. */
  icon: ReactNode;
  stats: DivisionStat[];
  delayMs?: number;
}) {
  return (
    <div
      className={cn(
        "animate-fade-up relative isolate overflow-hidden rounded-3xl border p-5",
        GLASS_SURFACE_STRONG,
        GLASS_BORDER
      )}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <span
        className="pointer-events-none absolute -right-10 -top-12 -z-10 h-36 w-36 rounded-full opacity-25 blur-3xl"
        style={{ background: gradient }}
        aria-hidden
      />
      <div className="relative mb-2 flex items-center gap-2.5">
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-sm"
          style={{ background: gradient }}
        >
          {icon}
        </div>
        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{label}</p>
      </div>
      <div className="relative flex flex-col divide-y divide-black/5 dark:divide-white/5">
        {stats.map((stat) => (
          <StatRow key={stat.label} stat={stat} />
        ))}
      </div>
    </div>
  );
}
