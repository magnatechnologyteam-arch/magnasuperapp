"use client";

import { useMemo } from "react";
import { AlertTriangle, Hammer, Warehouse, Wallet } from "lucide-react";
import { useProductionData } from "./ProductionDataProvider";
import { ACTIVE_BOOTH_STATUSES, isLowStock } from "@/lib/production/availability";
import { formatDateID, formatRupiah, todayISO } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";

const GRADIENT = "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)";

/**
 * Ringkasan modul Production: kartu KPI + daftar proyek mendekati deadline
 * instalasi dan material yang stoknya menipis. Semua angka dihitung
 * langsung dari state di ProductionDataProvider.
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
    return { proyekAktif, materialMenipis, nilaiStok, budgetAktif };
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

  const cards = [
    { label: "Proyek Aktif", value: String(stats.proyekAktif), icon: Hammer },
    { label: "Material Stok Menipis", value: String(stats.materialMenipis), icon: AlertTriangle },
    { label: "Nilai Stok Gudang", value: formatRupiah(stats.nilaiStok), icon: Warehouse },
    { label: "Budget Proyek Aktif", value: formatRupiah(stats.budgetAktif), icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900"
            >
              <div
                className="mb-3 grid h-10 w-10 place-items-center rounded-xl text-white"
                style={{ background: GRADIENT }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <p
                className={cn(
                  "font-extrabold tracking-tight text-zinc-900 dark:text-white",
                  c.value.length > 8 ? "text-lg" : "text-2xl"
                )}
              >
                {c.value}
              </p>
              <p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">{c.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="border-b border-black/5 px-5 py-3.5 dark:border-white/10">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Proyek Mendekati Deadline</h3>
          </div>
          {upcomingProjects.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-zinc-400">Tidak ada proyek aktif mendatang.</p>
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
            <p className="px-5 py-8 text-center text-sm text-zinc-400">Semua stok material aman.</p>
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
  );
}
