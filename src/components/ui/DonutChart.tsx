export type DonutDatum = {
  label: string;
  value: number;
  color: string;
};

/**
 * Donut chart SVG murni (tanpa library) untuk visualisasi distribusi status
 * — mis. sebaran status booking/proyek. Dipakai di ketiga halaman Ringkasan
 * supaya tidak melulu angka KPI datar; ini adalah representasi visual dari
 * data sungguhan (bukan angka yang dikarang).
 */
export function DonutChart({
  data,
  size = 108,
  thickness = 15,
}: {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 shrink-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className="stroke-zinc-100 dark:stroke-white/10"
        />
        {total > 0 &&
          data.map((d, i) => {
            if (d.value <= 0) return null;
            const fraction = d.value / total;
            const dash = fraction * circumference;
            const offset = cumulative * circumference;
            cumulative += fraction;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );
          })}
      </svg>

      {total === 0 ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">Belum ada data untuk ditampilkan.</p>
      ) : (
        <ul className="min-w-0 space-y-1.5">
          {data
            .filter((d) => d.value > 0)
            .map((d, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} />
                <span className="truncate text-zinc-500 dark:text-zinc-400">{d.label}</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{d.value}</span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
