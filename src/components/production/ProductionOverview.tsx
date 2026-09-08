"use client";

import { useMemo } from "react";
import { AlertTriangle, CalendarX2, Hammer, PackageCheck, Warehouse, Wallet } from "lucide-react";
import { useProductionData } from "./ProductionDataProvider";
import { ACTIVE_BOOTH_STATUSES, isLowStock } from "@/lib/production/availability";
import { formatDateID, formatRupiah, todayISO } from "@/lib/shared/utils";
import { StatCard } from "@/components/ui/StatCard";
import { DonutChart } from "@/components/ui/DonutChart";
import { EmptyState } from "@/components/ui/EmptyState";

const ACCENT_AMBER = "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)";
const ACCENT_ROSE = "linear-gradient(135deg, #F43F5E 0%, #FB7185 100%)";
const ACCENT_BLUE = "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)";
const ACCENT_EMERALD = "linear-gradient(135deg, #10B981 0%, #22D3EE 100%)";

const STAGE_COLORS: Record<string, string> = {
  Desain: "#0ea5e9",
  Produksi: "#f59e0b",
  Finishing: "#8b5cf6",
  Instalasi: "#06b6d4",
  Selesai: "#10b981",
  Dibatalkan: "#f43f5e",
};

/**
 * Ringkasan modul Production: kartu KPI (dengan bar proporsi dari data
 * asli) + donut tahap proyek booth + daftar proyek mendekati deadline &
 * material stok menipis. Semua angka dihitung langsung dari state di
 * ProductionDataProvider.
 */
export function ProductionOverview() {
  const { materials, projects } = useProductionData();

  const stats = useMemo(() => {
    const proyekAktif = projects.filter((p) => ACTIVE_BOOTH_STATUSES.includes(p.status)).length;
    const materialMenipis = materials.filter(isLowStock).length;
    const nilaiStok = materials.reduce((sum, m) => sum + m.stock * m.pricePerUnit, 0);
    const budgetAktif = projects
      .filter((p) => ACTIVE_BOOTH_STATUSES.includes(p.status))
      .reduce((sum, p) => sum + p.budget, 0);
    const budgetTotal = projects.reduce((sum, p) => sum + p.budget, 0);
    const stageCounts: Record<string, number> = {};
    for (const p of projects) stageCounts[p.status] = (stageCounts[p.status] ?? 0) + 1;
    return { proyekAktif, materialMenipis, nilaiStok, budgetAktif, budgetTotal, stageCounts };
  }, [materials, projects]);

  const upcomingProjects = useMemo(() => {
    const today = todayISO();
    return projects
      .filter((p) => ACTIVE_BOOTH_STATUSES.includes(p.status) && p.tanggalInstalasi >= today)
      .sort((a, b) => a.tanggalInstalasi.localeCompare(b.tanggalInstalasi))
      .slice(0, 5);
  }, [projects]);

  const lowStockMaterials = useMemo(
    () => materials.filter(isLowStock).sort((a, b) => a.stock - b.stock).slice(0, 5),
    [materials]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Proyek Aktif"
          value={String(stats.proyekAktif)}
          icon={Hammer}
          accent={ACCENT_AMBER}
          ratio={
            projects.length > 0
              ? { value: stats.proyekAktif, total: projects.length, caption: `dari ${projects.length} total proyek` }
              : undefined
          }
        />
        <StatCard
          label="Material Stok Menipis"
          value={String(stats.materialMenipis)}
          icon={AlertTriangle}
          accent={ACCENT_ROSE}
          delayMs={60}
          ratio={
            materials.length > 0
              ? { value: stats.materialMenipis, total: materials.length, caption: `dari ${materials.length} jenis material` }
              : undefined
          }
        />
        <StatCard
          label="Nilai Stok Gudang"
          value={formatRupiah(stats.nilaiStok)}
          icon={Warehouse}
          accent={ACCENT_BLUE}
          delayMs={120}
        />
        <StatCard
          label="Budget Proyek Aktif"
          value={formatRupiah(stats.budgetAktif)}
          icon={Wallet}
          accent={ACCENT_EMERALD}
          delayMs={180}
          ratio={
            stats.budgetTotal > 0
              ? { value: stats.budgetAktif, total: stats.budgetTotal, caption: `dari total ${formatRupiah(stats.budgetTotal)}` }
              : undefined
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="border-b border-black/5 px-5 py-3.5 dark:border-white/10">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Distribusi Tahap Proyek</h3>
          </div>
          <div className="px-5 py-5">
            <DonutChart
              data={Object.entries(STAGE_COLORS).map(([label, color]) => ({
                label,
                value: stats.stageCounts[label] ?? 0,
                color,
              }))}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:col-span-2 sm:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <div className="border-b border-black/5 px-5 py-3.5 dark:border-white/10">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Proyek Mendekati Deadline</h3>
            </div>
            {upcomingProjects.length === 0 ? (
              <EmptyState icon={CalendarX2} title="Tidak ada proyek aktif mendatang" />
            ) : (
              <ul className="divide-y divide-black/5 dark:divide-white/5">
                {upcomingProjects.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{p.name}</p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{p.namaKlien}</p>
                    </div>
                    <p className="shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {formatDateID(p.tanggalInstalasi)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <div className="border-b border-black/5 px-5 py-3.5 dark:border-white/10">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Material Stok Menipis</h3>
            </div>
            {lowStockMaterials.length === 0 ? (
              <EmptyState icon={PackageCheck} title="Semua stok material aman" />
            ) : (
              <ul className="divide-y divide-black/5 dark:divide-white/5">
                {lowStockMaterials.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{m.name}</p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{m.location}</p>
                    </div>
                    <p className="shrink-0 text-xs font-semibold text-rose-600 dark:text-rose-400">
                      {m.stock} / {m.minStock} {m.unit}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
