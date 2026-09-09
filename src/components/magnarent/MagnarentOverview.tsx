"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Boxes, CalendarCheck2, CalendarX2, PackageCheck, PackageX, TrendingUp, Wrench } from "lucide-react";
import { useMagnarentData } from "./MagnarentDataProvider";
import { getInventoryStatus } from "@/lib/magnarent/availability";
import { calculateBookingTotal, formatRupiah } from "@/lib/magnarent/pricing";
import { formatDateID, todayISO } from "@/lib/magnarent/date";
import { computeItemUtilization } from "@/lib/magnarent/utilization";
import { getAvatarColor, getInitials } from "@/lib/shared/utils";
import { StatCard } from "@/components/ui/StatCard";
import { DonutChart } from "@/components/ui/DonutChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";

const UTILIZATION_WINDOW_DAYS = 90;

const ACCENT_BLUE = "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)";
const ACCENT_AMBER = "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)";
const ACCENT_ROSE = "linear-gradient(135deg, #F43F5E 0%, #FB7185 100%)";
const ACCENT_EMERALD = "linear-gradient(135deg, #10B981 0%, #22D3EE 100%)";

/**
 * Ringkasan modul Magnarent: kartu KPI (tiap kartu punya bar proporsi dari
 * data asli, bukan angka tren yang dikarang) + donut distribusi status
 * booking + daftar booking terdekat. Semua angka dihitung langsung dari
 * state di MagnarentDataProvider, jadi otomatis ikut berubah begitu ada
 * aksi di tab Inventaris/Booking.
 */
export function MagnarentOverview() {
  const { inventory, bookings } = useMagnarentData();

  const stats = useMemo(() => {
    const totalAlat = inventory.length;
    const tersedia = inventory.filter((i) => getInventoryStatus(i, bookings) === "Tersedia").length;
    const perluMaintenance = inventory.filter((i) => getInventoryStatus(i, bookings) === "Maintenance").length;
    const bookingAktif = bookings.filter((b) => b.status === "Menunggu" || b.status === "Dikonfirmasi").length;
    const dikonfirmasiAktif = bookings.filter((b) => b.status === "Dikonfirmasi").length;
    const nilaiTerkonfirmasi = bookings
      .filter((b) => b.status === "Dikonfirmasi")
      .reduce((sum, b) => sum + calculateBookingTotal(b, inventory.find((i) => i.id === b.itemId)), 0);
    const nilaiMenunggu = bookings
      .filter((b) => b.status === "Menunggu")
      .reduce((sum, b) => sum + calculateBookingTotal(b, inventory.find((i) => i.id === b.itemId)), 0);
    const statusCounts = {
      Menunggu: bookings.filter((b) => b.status === "Menunggu").length,
      Dikonfirmasi: bookings.filter((b) => b.status === "Dikonfirmasi").length,
      Selesai: bookings.filter((b) => b.status === "Selesai").length,
      Dibatalkan: bookings.filter((b) => b.status === "Dibatalkan").length,
    };
    return {
      totalAlat,
      tersedia,
      perluMaintenance,
      bookingAktif,
      dikonfirmasiAktif,
      nilaiTerkonfirmasi,
      nilaiMenunggu,
      statusCounts,
    };
  }, [inventory, bookings]);

  const upcoming = useMemo(() => {
    const today = todayISO();
    return bookings
      .filter((b) => b.tanggalSelesai >= today && b.status !== "Dibatalkan")
      .sort((a, b) => a.tanggalMulai.localeCompare(b.tanggalMulai))
      .slice(0, 5);
  }, [bookings]);

  const itemName = (id: string) => inventory.find((i) => i.id === id)?.name ?? "—";
  const totalPotensi = stats.nilaiTerkonfirmasi + stats.nilaiMenunggu;

  /**
   * Item populer vs. kandidat dilepas — jawaban langsung untuk permintaan
   * investor soal "stok dan pemutaran barang" (lihat komentar di
   * src/lib/magnarent/utilization.ts). Cuma tampilkan 3 teratas di sini;
   * daftar lengkap + filter ada di tab "Perputaran".
   */
  const utilization = useMemo(
    () => computeItemUtilization(inventory, bookings, UTILIZATION_WINDOW_DAYS),
    [inventory, bookings]
  );
  const topBerputar = useMemo(
    () =>
      [...utilization]
        .filter((r) => r.rentedUnitDays > 0)
        .sort((a, b) => b.utilizationPct - a.utilizationPct)
        .slice(0, 3),
    [utilization]
  );
  const kandidatDilepas = useMemo(
    () =>
      [...utilization]
        .filter((r) => r.tier === "idle")
        .sort((a, b) => (b.daysSinceLastUsed ?? Infinity) - (a.daysSinceLastUsed ?? Infinity))
        .slice(0, 3),
    [utilization]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Alat"
          value={String(stats.totalAlat)}
          icon={Boxes}
          accent={ACCENT_BLUE}
          ratio={
            stats.totalAlat > 0
              ? { value: stats.tersedia, total: stats.totalAlat, caption: `${stats.tersedia} berstatus Tersedia` }
              : undefined
          }
        />
        <StatCard
          label="Booking Aktif"
          value={String(stats.bookingAktif)}
          icon={CalendarCheck2}
          accent={ACCENT_AMBER}
          delayMs={60}
          ratio={
            stats.bookingAktif > 0
              ? { value: stats.dikonfirmasiAktif, total: stats.bookingAktif, caption: `${stats.dikonfirmasiAktif} sudah dikonfirmasi` }
              : undefined
          }
        />
        <StatCard
          label="Perlu Maintenance"
          value={String(stats.perluMaintenance)}
          icon={Wrench}
          accent={ACCENT_ROSE}
          delayMs={120}
          ratio={
            stats.totalAlat > 0
              ? { value: stats.perluMaintenance, total: stats.totalAlat, caption: `dari ${stats.totalAlat} jenis alat` }
              : undefined
          }
        />
        <StatCard
          label="Nilai Booking Terkonfirmasi"
          value={formatRupiah(stats.nilaiTerkonfirmasi)}
          icon={PackageCheck}
          accent={ACCENT_EMERALD}
          delayMs={180}
          ratio={
            totalPotensi > 0
              ? { value: stats.nilaiTerkonfirmasi, total: totalPotensi, caption: `dari potensi ${formatRupiah(totalPotensi)}` }
              : undefined
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="border-b border-black/5 px-5 py-3.5 dark:border-white/10">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Distribusi Status Booking</h3>
          </div>
          <div className="px-5 py-5">
            <DonutChart
              data={[
                { label: "Menunggu", value: stats.statusCounts.Menunggu, color: "#f59e0b" },
                { label: "Dikonfirmasi", value: stats.statusCounts.Dikonfirmasi, color: "#10b981" },
                { label: "Selesai", value: stats.statusCounts.Selesai, color: "#71717a" },
                { label: "Dibatalkan", value: stats.statusCounts.Dibatalkan, color: "#f43f5e" },
              ]}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900 lg:col-span-2">
          <div className="border-b border-black/5 px-5 py-3.5 dark:border-white/10">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Booking Terdekat</h3>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarX2}
              title="Tidak ada booking mendatang"
              description="Booking baru yang belum lewat tanggal selesainya akan muncul di sini."
            />
          ) : (
            <ul className="divide-y divide-black/5 dark:divide-white/5">
              {upcoming.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                  <span
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white",
                      getAvatarColor(b.namaKlien)
                    )}
                  >
                    {getInitials(b.namaKlien)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{b.namaKlien}</p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{itemName(b.itemId)}</p>
                  </div>
                  <p className="shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {formatDateID(b.tanggalMulai)} – {formatDateID(b.tanggalSelesai)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-black/5 px-5 py-3.5 dark:border-white/10">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Paling Sering Berputar
            </h3>
            <Link
              href="/dashboard/magnarent/utilisasi"
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Lihat semua
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {topBerputar.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="Belum ada data perputaran"
              description="Muncul begitu ada booking Dikonfirmasi/Selesai dalam 90 hari terakhir."
            />
          ) : (
            <ul className="divide-y divide-black/5 dark:divide-white/5">
              {topBerputar.map((r) => (
                <li key={r.item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{r.item.name}</p>
                  <span className="shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {r.utilizationPct}% utilisasi
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-black/5 px-5 py-3.5 dark:border-white/10">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white">
              <PackageX className="h-4 w-4 text-rose-500" />
              Kandidat Dilepas (Idle)
            </h3>
            <Link
              href="/dashboard/magnarent/utilisasi"
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Lihat semua
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {kandidatDilepas.length === 0 ? (
            <EmptyState
              icon={PackageCheck}
              title="Tidak ada alat idle"
              description="Semua alat masih cukup sering berputar dalam 90 hari terakhir."
            />
          ) : (
            <ul className="divide-y divide-black/5 dark:divide-white/5">
              {kandidatDilepas.map((r) => (
                <li key={r.item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{r.item.name}</p>
                  <span className="shrink-0 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {r.daysSinceLastUsed === null ? "Belum pernah dipakai" : `${r.daysSinceLastUsed} hari idle`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
