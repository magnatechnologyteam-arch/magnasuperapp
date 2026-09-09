"use client";

import { useMemo, useState } from "react";
import { Boxes, Gauge, PackageX, TrendingDown, TrendingUp } from "lucide-react";
import { useMagnarentData } from "./MagnarentDataProvider";
import { computeItemUtilization, type UtilizationTier } from "@/lib/magnarent/utilization";
import { formatDateID } from "@/lib/magnarent/date";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";

const ACCENT_BLUE = "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)";
const ACCENT_EMERALD = "linear-gradient(135deg, #10B981 0%, #22D3EE 100%)";
const ACCENT_AMBER = "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)";
const ACCENT_ROSE = "linear-gradient(135deg, #F43F5E 0%, #FB7185 100%)";

const WINDOW_OPTIONS = [30, 90, 180] as const;

const TIER_LABEL: Record<UtilizationTier, string> = {
  aktif: "Berputar Baik",
  kurang: "Kurang Berputar",
  idle: "Idle — Kandidat Dilepas",
};

const TIER_BADGE: Record<UtilizationTier, string> = {
  aktif: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  kurang: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  idle: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

const TIER_BAR_COLOR: Record<UtilizationTier, string> = {
  aktif: "#10b981",
  kurang: "#f59e0b",
  idle: "#f43f5e",
};

const ALL_TIER_FILTER = "Semua Status";

/**
 * Laporan perputaran/utilisasi alat Magnarent — jawaban langsung untuk
 * permintaan investor (diteruskan owner): "bukan duitnya yang jadi
 * perhatian, tapi stok dan pemutaran barang" + "kalau barang diem doang
 * mungkin ada baiknya slowly kita let go buat space".
 *
 * Diurutkan dari yang PALING JARANG berputar di atas — supaya langsung
 * kelihatan alat mana yang jadi kandidat pertama kalau mau dilepas.
 * "Terakhir Dipakai" dihitung dari SELURUH riwayat booking (tidak
 * dibatasi window yang dipilih), sementara persentase utilisasi memang
 * dihitung dalam window itu — lihat komentar di
 * src/lib/magnarent/utilization.ts untuk alasannya.
 */
export function UtilizationReport() {
  const { inventory, bookings } = useMagnarentData();
  const [windowDays, setWindowDays] = useState<number>(90);
  const [tierFilter, setTierFilter] = useState<string>(ALL_TIER_FILTER);

  const rows = useMemo(
    () => computeItemUtilization(inventory, bookings, windowDays),
    [inventory, bookings, windowDays]
  );

  const sorted = useMemo(() => [...rows].sort((a, b) => a.utilizationPct - b.utilizationPct), [rows]);

  const filtered = useMemo(() => {
    if (tierFilter === ALL_TIER_FILTER) return sorted;
    return sorted.filter((r) => TIER_LABEL[r.tier] === tierFilter);
  }, [sorted, tierFilter]);

  const summary = useMemo(() => {
    const aktif = rows.filter((r) => r.tier === "aktif").length;
    const kurang = rows.filter((r) => r.tier === "kurang").length;
    const idle = rows.filter((r) => r.tier === "idle").length;
    return { aktif, kurang, idle, total: rows.length };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Alat" value={String(summary.total)} icon={Boxes} accent={ACCENT_BLUE} />
        <StatCard
          label="Berputar Baik"
          value={String(summary.aktif)}
          icon={TrendingUp}
          accent={ACCENT_EMERALD}
          delayMs={60}
          ratio={
            summary.total > 0
              ? { value: summary.aktif, total: summary.total, caption: `dari ${summary.total} jenis alat` }
              : undefined
          }
        />
        <StatCard
          label="Kurang Berputar"
          value={String(summary.kurang)}
          icon={TrendingDown}
          accent={ACCENT_AMBER}
          delayMs={120}
          ratio={
            summary.total > 0
              ? { value: summary.kurang, total: summary.total, caption: `dari ${summary.total} jenis alat` }
              : undefined
          }
        />
        <StatCard
          label="Idle — Kandidat Dilepas"
          value={String(summary.idle)}
          icon={PackageX}
          accent={ACCENT_ROSE}
          delayMs={180}
          ratio={
            summary.total > 0
              ? { value: summary.idle, total: summary.total, caption: `dari ${summary.total} jenis alat` }
              : undefined
          }
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Perputaran per Alat</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Diurutkan dari yang paling jarang berputar — kandidat pertama kalau mau melepas stok untuk bikin ruang
            gudang.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <select
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-sm text-zinc-700 outline-none ring-blue-500/40 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
          >
            {WINDOW_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} hari terakhir
              </option>
            ))}
          </select>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-sm text-zinc-700 outline-none ring-blue-500/40 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
          >
            <option>{ALL_TIER_FILTER}</option>
            {Object.values(TIER_LABEL).map((label) => (
              <option key={label}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <th className="px-5 py-3">Alat</th>
                <th className="px-5 py-3">Lokasi</th>
                <th className="px-5 py-3 text-right">Total Unit</th>
                <th className="px-5 py-3">Utilisasi ({windowDays} Hari)</th>
                <th className="px-5 py-3">Terakhir Dipakai</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Gauge}
                      title={rows.length === 0 ? "Belum ada alat inventaris" : "Tidak ada hasil"}
                      description={
                        rows.length === 0
                          ? "Tambahkan alat di tab Inventaris untuk mulai memantau perputarannya."
                          : "Coba ubah filter status di atas."
                      }
                    />
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.item.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{r.item.name}</td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{r.item.location}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {r.item.totalUnit}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{ width: `${r.utilizationPct}%`, background: TIER_BAR_COLOR[r.tier] }}
                        />
                      </div>
                      <span className="tabular-nums text-zinc-700 dark:text-zinc-300">{r.utilizationPct}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">
                    {r.lastUsedDate ? (
                      <>
                        {formatDateID(r.lastUsedDate)}
                        <span className="block text-[11px] text-zinc-400 dark:text-zinc-500">
                          {r.daysSinceLastUsed} hari lalu
                        </span>
                      </>
                    ) : (
                      "Belum pernah dipakai"
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", TIER_BADGE[r.tier])}>
                      {TIER_LABEL[r.tier]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
