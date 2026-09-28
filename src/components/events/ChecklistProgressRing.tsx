import { cn } from "@/lib/cn";

/**
 * Tahap 49: cincin progres (donut SVG) checklist event -- dipakai di kartu
 * daftar Papan Tracking (EventTrackingList) & header papan detail
 * (EventTrackingBoard). Datanya 100% asli (jumlah item checklist "Selesai"
 * dibagi total item event itu), BUKAN angka ilustratif seperti contoh di
 * mockup Bento -- baru sekarang dibuat karena checklist per-event ini
 * memang sudah punya denominator ("total") yang nyata, beda dengan KPI
 * Dashboard Hub yang sengaja belum dikasih grafik/persentase karena
 * `summary.ts` belum punya field "total"-nya.
 *
 * Warna solid (bukan gradient via <defs>) SENGAJA dipilih -- kalau pakai
 * gradient lewat elemen <linearGradient id="..."> maka tiap instance ring
 * yang dirender berkali-kali (satu per kartu event di halaman daftar) akan
 * saling tabrak id-nya di DOM (id harus unik per halaman).
 */
export function ChecklistProgressRing({
  percent,
  size = 44,
  strokeWidth = 5,
  label,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;
  const isComplete = clamped >= 100;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-zinc-200 dark:stroke-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            "transition-[stroke-dashoffset] duration-500",
            isComplete ? "stroke-emerald-500 dark:stroke-emerald-400" : "stroke-violet-500 dark:stroke-fuchsia-400"
          )}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-200">{label ?? `${Math.round(clamped)}%`}</span>
      </div>
    </div>
  );
}
