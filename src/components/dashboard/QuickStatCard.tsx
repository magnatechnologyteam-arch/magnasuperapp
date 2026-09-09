"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/** Hitung naik dari 0 ke `target` setiap kartu ini muncul — kartu Ringkasan
 * Cepat di Dashboard Hub jadi terasa hidup begitu halaman selesai dimuat,
 * bukan cuma angka statis yang langsung nongol. */
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

export function QuickStatCard({
  label,
  value,
  hint,
  icon,
  accent,
  href,
  warn,
  delayMs = 0,
  format,
}: {
  label: string;
  value: number;
  hint: string;
  /** Elemen ikon SUDAH DIRENDER (mis. `<CalendarRange className="h-5 w-5" />`),
   * bukan referensi komponennya — komponen ikon (fungsi) tidak bisa lewat
   * batas Server->Client Component sebagai prop, sedangkan elemen React hasil
   * pemanggilannya bisa (lihat pemanggil di src/app/dashboard/page.tsx, sebuah
   * Server Component). */
  icon: ReactNode;
  accent: string;
  href: string;
  warn?: boolean;
  delayMs?: number;
  /** Kalau `value` sebenarnya nominal Rupiah (mis. Ringkasan Investor), format
   * angka yang lagi "berhitung naik" ini pakai `formatRupiah` alih-alih
   * ditampilkan mentah sebagai integer biasa. */
  format?: (value: number) => string;
}) {
  const animated = useCountUp(value);

  return (
    <Link
      href={href}
      className="animate-fade-up group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-zinc-900"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {warn && <span className="absolute inset-0 animate-pulse bg-rose-500/5" aria-hidden />}
      <div className="relative shrink-0">
        <span
          className="absolute -inset-1 rounded-xl opacity-25 blur-md transition-opacity group-hover:opacity-45"
          style={{ background: accent }}
          aria-hidden
        />
        <div
          className="relative grid h-10 w-10 place-items-center rounded-xl text-white transition-transform group-hover:scale-110"
          style={{ background: accent }}
        >
          {icon}
        </div>
      </div>
      <div className="relative min-w-0">
        <p
          className={cn(
            "text-xl font-extrabold leading-none tabular-nums",
            warn ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-white"
          )}
        >
          {format ? format(animated) : animated}
        </p>
        <p className="mt-1 truncate text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</p>
        <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">{hint}</p>
      </div>
    </Link>
  );
}
