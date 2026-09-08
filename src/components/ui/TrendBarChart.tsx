export type TrendDatum = { label: string; value: number };

/**
 * Bar chart horizontal SVG-free (murni div + persentase lebar) — pola yang
 * sama dengan `DonutChart` (tanpa library eksternal), dipakai untuk tren
 * bulanan yang sumbunya cuma satu arah (nilai), jadi tidak perlu axis/sumbu
 * seperti chart library penuh. Server-renderable (tidak ada hook/interaksi),
 * jadi bisa langsung dipakai di dalam Server Component.
 */
export function TrendBarChart({
  data,
  formatValue,
}: {
  data: TrendDatum[];
  formatValue: (value: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const allZero = data.every((d) => d.value === 0);

  return (
    <div className="space-y-3">
      {allZero && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Belum ada pendapatan "Lunas" tercatat di rentang bulan ini.
        </p>
      )}
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">{d.label}</span>
          <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-[width] duration-700 ease-out"
              style={{ width: d.value > 0 ? `${Math.max((d.value / max) * 100, 3)}%` : "0%" }}
            />
          </div>
          <span className="w-28 shrink-0 text-right text-xs font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">
            {formatValue(d.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
