"use client";

import { useMemo, useState } from "react";
import { CalendarClock, PackageCheck, TrendingUp, Undo2 } from "lucide-react";
import { useProductionData } from "./ProductionDataProvider";
import {
  DEFAULT_LOOKAHEAD_DAYS,
  findReuseForecastMatches,
  forecastMaterialAvailability,
} from "@/lib/production/materialReuseForecast";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateID, todayISO } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";
import { GLASS_BORDER, GLASS_INPUT, GLASS_SURFACE } from "@/lib/glass";

const ACCENT_SKY = "linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%)";
const ACCENT_EMERALD = "linear-gradient(135deg, #10B981 0%, #22D3EE 100%)";
const ACCENT_AMBER = "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)";

const LOOKAHEAD_OPTIONS = [30, 60, 90] as const;

/**
 * Forecast reuse material ke depan (Tahap 45 — analisis-kompetitor #217,
 * gap #forecast di analisis-gap-production.md). Beda dengan
 * `MaterialReuseReport` yang HISTORIS (rekap material yang SUDAH pernah
 * dipakai ulang), komponen ini FORWARD-LOOKING: proyeksi material apa
 * yang akan bebas dari proyek yang mau dibongkar, dan proyek aktif lain
 * mana yang bisa memakainya sebelum beli/sewa baru. Murni heuristik
 * jendela tanggal + aritmatika qty (lihat materialReuseForecast.ts) — TIDAK
 * ADA AI/LLM.
 */
export function MaterialReuseForecastReport() {
  const { materials, projects } = useProductionData();
  const [lookaheadDays, setLookaheadDays] = useState<number>(DEFAULT_LOOKAHEAD_DAYS);
  const today = useMemo(() => todayISO(), []);

  const availability = useMemo(
    () => forecastMaterialAvailability(projects, materials, today, lookaheadDays),
    [projects, materials, today, lookaheadDays]
  );
  const matches = useMemo(
    () => findReuseForecastMatches(projects, materials, today, lookaheadDays),
    [projects, materials, today, lookaheadDays]
  );

  const matchedFromKeys = useMemo(
    () => new Set(matches.map((m) => `${m.materialId}|${m.fromProjectId}`)),
    [matches]
  );
  const unmatchedAvailability = useMemo(
    () => availability.filter((a) => !matchedFromKeys.has(`${a.materialId}|${a.fromProjectId}`)),
    [availability, matchedFromKeys]
  );

  const summary = useMemo(() => {
    const proyekDiuntungkan = new Set(matches.map((m) => m.toProjectId)).size;
    const kekuranganTertutupi = matches.filter((m) => m.adaKekuranganStok).length;
    return {
      totalAkanBebas: availability.length,
      proyekDiuntungkan,
      kekuranganTertutupi,
    };
  }, [availability, matches]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Material Akan Bebas"
          value={String(summary.totalAkanBebas)}
          icon={CalendarClock}
          accent={ACCENT_SKY}
        />
        <StatCard
          label="Proyek Bisa Diuntungkan"
          value={String(summary.proyekDiuntungkan)}
          icon={TrendingUp}
          accent={ACCENT_EMERALD}
          delayMs={60}
        />
        <StatCard
          label="Kekurangan Stok Bisa Tertutupi"
          value={String(summary.kekuranganTertutupi)}
          icon={PackageCheck}
          accent={ACCENT_AMBER}
          delayMs={120}
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Forecast Reuse Material</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Proyeksi material dari proyek yang akan dibongkar, dicocokkan dengan proyek aktif lain yang butuh
            material yang sama sebelum beli/sewa baru.
          </p>
        </div>
        <select
          value={lookaheadDays}
          onChange={(e) => setLookaheadDays(Number(e.target.value))}
          className={cn("rounded-full border px-3.5 py-2 text-sm text-zinc-700 outline-none ring-sky-500/40 focus:ring-2 dark:text-zinc-200 dark:[&>option]:bg-zinc-900", GLASS_INPUT)}
        >
          {LOOKAHEAD_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d} hari ke depan
            </option>
          ))}
        </select>
      </div>

      <div className={cn("overflow-hidden rounded-2xl border shadow-sm", GLASS_SURFACE, GLASS_BORDER)}>
        {matches.length === 0 ? (
          <EmptyState
            icon={Undo2}
            title="Belum ada kecocokan reuse"
            description={
              availability.length === 0
                ? "Isi \"Estimasi Tanggal Bongkar\" di proyek aktif (form Buat/Edit Proyek) supaya forecast ini bisa jalan."
                : "Ada material yang akan bebas, tapi belum ada proyek aktif lain yang butuh material yang sama dalam periode ini."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                  <th className="px-5 py-3">Material</th>
                  <th className="px-5 py-3">Dari Proyek (Bongkar)</th>
                  <th className="px-5 py-3">Ke Proyek (Instalasi)</th>
                  <th className="px-5 py-3 text-right">Tersedia / Dibutuhkan</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m, i) => (
                  <tr
                    key={`${m.materialId}-${m.fromProjectId}-${m.toProjectId}-${i}`}
                    className="border-b border-black/5 last:border-0 dark:border-white/5"
                  >
                    <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{m.materialName}</td>
                    <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">
                      {m.fromProjectName}
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        bongkar {formatDateID(m.tanggalBongkarEstimasi)}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">
                      {m.toProjectName}
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        instalasi {formatDateID(m.tanggalInstalasi)}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                      {m.qtyAkanTersedia} / {m.qtyDibutuhkan}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-semibold",
                          m.adaKekuranganStok
                            ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        )}
                      >
                        {m.adaKekuranganStok ? "Stok gudang kurang" : "Stok gudang cukup"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {unmatchedAvailability.length > 0 && (
        <div className="rounded-2xl border border-dashed border-black/10 bg-zinc-50/60 px-5 py-4 dark:border-white/10 dark:bg-white/[0.02]">
          <p className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Material akan bebas, belum ada proyek lain yang cocok:
          </p>
          <ul className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            {unmatchedAvailability.map((a, i) => (
              <li key={`${a.materialId}-${a.fromProjectId}-${i}`}>
                {a.materialName} ({a.qtyAkanTersedia}) — dari {a.fromProjectName}, bebas{" "}
                {formatDateID(a.tanggalBongkarEstimasi)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
