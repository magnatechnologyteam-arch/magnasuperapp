"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, PackageCheck, ShoppingCart } from "lucide-react";
import { useProductionData } from "./ProductionDataProvider";
import { ACTIVE_BOOTH_STATUSES, getAllocatedQty } from "@/lib/production/availability";
import { formatDateID, formatRupiah } from "@/lib/shared/utils";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import type { BoothProject, MaterialItem, PurchaseOrder } from "@/lib/production/types";

const ACCENT_ROSE = "linear-gradient(135deg, #F43F5E 0%, #EC4899 100%)";
const ACCENT_AMBER = "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)";
const ACCENT_EMERALD = "linear-gradient(135deg, #10B981 0%, #22D3EE 100%)";

const ALL_FILTER = "Semua Material";
const NEEDS_PO_FILTER = "Perlu PO Tambahan";

type MrpRow = {
  material: MaterialItem;
  allocated: number;
  available: number;
  pendingPO: number;
  netProjection: number;
  shortfall: number;
  nearestDeadline: string | null;
  nearestProjectName: string | null;
};

/**
 * MRP sederhana (Tahap 44 — gap #1 analisis-gap-production.md): proyeksi
 * kebutuhan pembelian ke depan, BUKAN cuma alarm reaktif "stok di bawah
 * ambang" yang sudah ada di tab Material. Untuk tiap material: stok fisik
 * dikurangi alokasi proyek AKTIF (`getAllocatedQty`, sama persis dengan
 * logika ketersediaan di form Proyek Booth) ditambah PO yang sudah
 * dipesan tapi belum diterima ("Dipesan") — kalau proyeksi bersihnya
 * masih negatif, itu artinya PO tambahan perlu dibuat, dan proyek dengan
 * tanggal instalasi TERDEKAT yang memakai material itu ditampilkan supaya
 * jelas mana yang paling mendesak. Murni turunan dari data yang sudah ada
 * (materials, projects, purchaseOrders) — tidak ada Server Action baru.
 */
function computeMrp(materials: MaterialItem[], projects: BoothProject[], purchaseOrders: PurchaseOrder[]): MrpRow[] {
  const activeProjects = projects.filter((p) => ACTIVE_BOOTH_STATUSES.includes(p.status));

  return materials.map((material) => {
    const allocated = getAllocatedQty(material.id, projects);
    const available = material.stock - allocated;
    const pendingPO = purchaseOrders
      .filter((po) => po.materialId === material.id && po.status === "Dipesan")
      .reduce((sum, po) => sum + po.qty, 0);
    const netProjection = available + pendingPO;
    const shortfall = Math.max(0, -netProjection);

    const usingProjects = activeProjects
      .filter((p) => p.materials.some((m) => m.materialId === material.id))
      .sort((a, b) => a.tanggalInstalasi.localeCompare(b.tanggalInstalasi));
    const nearest = usingProjects[0];

    return {
      material,
      allocated,
      available,
      pendingPO,
      netProjection,
      shortfall,
      nearestDeadline: nearest?.tanggalInstalasi ?? null,
      nearestProjectName: nearest?.name ?? null,
    };
  });
}

export function MrpReport() {
  const { materials, projects, purchaseOrders } = useProductionData();
  const [filter, setFilter] = useState<string>(NEEDS_PO_FILTER);

  const rows = useMemo(() => computeMrp(materials, projects, purchaseOrders), [materials, projects, purchaseOrders]);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if (b.shortfall !== a.shortfall) return b.shortfall - a.shortfall;
        if (a.nearestDeadline && b.nearestDeadline) return a.nearestDeadline.localeCompare(b.nearestDeadline);
        if (a.nearestDeadline) return -1;
        if (b.nearestDeadline) return 1;
        return a.material.name.localeCompare(b.material.name);
      }),
    [rows]
  );

  const filtered = useMemo(
    () => (filter === NEEDS_PO_FILTER ? sorted.filter((r) => r.shortfall > 0) : sorted),
    [sorted, filter]
  );

  const summary = useMemo(() => {
    const needsPO = rows.filter((r) => r.shortfall > 0).length;
    const totalShortfallValue = rows.reduce((sum, r) => sum + r.shortfall * r.material.pricePerUnit, 0);
    const withPendingPO = rows.filter((r) => r.pendingPO > 0).length;
    return { needsPO, totalShortfallValue, withPendingPO, total: rows.length };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Material Perlu PO Tambahan"
          value={String(summary.needsPO)}
          icon={AlertTriangle}
          accent={ACCENT_ROSE}
          ratio={summary.total > 0 ? { value: summary.needsPO, total: summary.total, caption: `dari ${summary.total} jenis material` } : undefined}
        />
        <StatCard
          label="Estimasi Nilai Kekurangan"
          value={formatRupiah(summary.totalShortfallValue)}
          icon={ShoppingCart}
          accent={ACCENT_AMBER}
          delayMs={60}
        />
        <StatCard
          label="Sudah Ada PO Berjalan"
          value={String(summary.withPendingPO)}
          icon={PackageCheck}
          accent={ACCENT_EMERALD}
          delayMs={120}
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Proyeksi Kebutuhan Material (MRP)</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Stok dikurangi alokasi proyek aktif, ditambah PO yang sudah dipesan — diurutkan dari kekurangan terbesar & deadline proyek terdekat.
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-sm text-zinc-700 outline-none ring-orange-500/40 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
        >
          <option>{NEEDS_PO_FILTER}</option>
          <option>{ALL_FILTER}</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        {filtered.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            title={filter === NEEDS_PO_FILTER ? "Tidak ada material yang perlu PO tambahan" : "Belum ada material terdaftar"}
            description={
              filter === NEEDS_PO_FILTER
                ? "Semua kebutuhan material proyek aktif sudah tercukupi stok + PO berjalan."
                : "Tambahkan material di tab Material untuk mulai memantau proyeksinya."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                  <th className="px-5 py-3">Material</th>
                  <th className="px-5 py-3 text-right">Stok</th>
                  <th className="px-5 py-3 text-right">Teralokasi</th>
                  <th className="px-5 py-3 text-right">PO Berjalan</th>
                  <th className="px-5 py-3 text-right">Proyeksi Bersih</th>
                  <th className="px-5 py-3">Proyek Terdekat</th>
                  <th className="px-5 py-3 text-right">Rekomendasi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.material.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                    <td className="px-5 py-3">
                      <p className="font-medium text-zinc-900 dark:text-white">{r.material.name}</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">{r.material.category}</p>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-300">
                      {r.material.stock} {r.material.unit}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-300">
                      {r.allocated} {r.material.unit}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-300">
                      {r.pendingPO > 0 ? `+${r.pendingPO} ${r.material.unit}` : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-5 py-3 text-right font-semibold tabular-nums",
                        r.netProjection < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {r.netProjection} {r.material.unit}
                    </td>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">
                      {r.nearestProjectName ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <CalendarClock className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                          <div>
                            <p className="font-medium text-zinc-700 dark:text-zinc-200">{r.nearestProjectName}</p>
                            <p className="text-zinc-400 dark:text-zinc-500">{formatDateID(r.nearestDeadline!)}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-300 dark:text-zinc-600">Tidak dipakai proyek aktif</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {r.shortfall > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                          <AlertTriangle className="h-3 w-3" />
                          Perlu PO {r.shortfall} {r.material.unit}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-300 dark:text-zinc-600">Cukup</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
