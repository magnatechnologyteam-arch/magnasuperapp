import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type StatCardRatio = {
  value: number;
  total: number;
  caption: string;
};

/**
 * Kartu KPI generik — dipakai di ketiga halaman Ringkasan (Magnarent,
 * Magnative, Production) menggantikan markup KPI yang sebelumnya
 * copy-paste identik di tiga tempat. `ratio` opsional menampilkan bar
 * proporsi tipis di bawah angka (mis. "3 dari 5 booking aktif") — dihitung
 * dari data asli, bukan angka tren yang dikarang-karang.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  ratio,
  delayMs = 0,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
  ratio?: StatCardRatio;
  delayMs?: number;
}) {
  const pct =
    ratio && ratio.total > 0 ? Math.min(100, Math.max(0, (ratio.value / ratio.total) * 100)) : null;

  return (
    <div
      className="animate-fade-up group relative overflow-hidden rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-zinc-900"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} aria-hidden />
      <div
        className="grid h-10 w-10 place-items-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-110"
        style={{ background: accent }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p
        className={cn(
          "mt-3.5 font-extrabold tracking-tight text-zinc-900 dark:text-white",
          value.length > 10 ? "text-lg" : "text-2xl"
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>

      {pct !== null && ratio && (
        <div className="mt-3.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${pct}%`, background: accent }}
            />
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">{ratio.caption}</p>
        </div>
      )}
    </div>
  );
}
