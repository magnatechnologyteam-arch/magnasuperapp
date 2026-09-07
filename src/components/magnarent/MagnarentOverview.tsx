"use client";

import { useMemo } from "react";
import { Boxes, CalendarCheck2, PackageCheck, Wrench } from "lucide-react";
import { useMagnarentData } from "./MagnarentDataProvider";
import { getInventoryStatus } from "@/lib/magnarent/availability";
import { calculateBookingTotal, formatRupiah } from "@/lib/magnarent/pricing";
import { formatDateID, todayISO } from "@/lib/magnarent/date";
import { cn } from "@/lib/cn";

const GRADIENT = "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)";

/**
 * Ringkasan modul Magnarent: kartu KPI + daftar booking terdekat.
 * Semua angka dihitung langsung dari state di MagnarentDataProvider, jadi
 * otomatis ikut berubah begitu ada aksi di tab Inventaris/Booking.
 */
export function MagnarentOverview() {
  const { inventory, bookings } = useMagnarentData();

  const stats = useMemo(() => {
    const totalAlat = inventory.length;
    const perluMaintenance = inventory.filter((i) => getInventoryStatus(i, bookings) === "Maintenance").length;
    const bookingAktif = bookings.filter((b) => b.status === "Menunggu" || b.status === "Dikonfirmasi").length;
    const nilaiTerkonfirmasi = bookings
      .filter((b) => b.status === "Dikonfirmasi")
      .reduce((sum, b) => sum + calculateBookingTotal(b, inventory.find((i) => i.id === b.itemId)), 0);
    return { totalAlat, perluMaintenance, bookingAktif, nilaiTerkonfirmasi };
  }, [inventory, bookings]);

  const upcoming = useMemo(() => {
    const today = todayISO();
    return bookings
      .filter((b) => b.tanggalSelesai >= today && b.status !== "Dibatalkan")
      .sort((a, b) => a.tanggalMulai.localeCompare(b.tanggalMulai))
      .slice(0, 5);
  }, [bookings]);

  const itemName = (id: string) => inventory.find((i) => i.id === id)?.name ?? "—";

  const cards = [
    { label: "Total Alat", value: String(stats.totalAlat), icon: Boxes },
    { label: "Booking Aktif", value: String(stats.bookingAktif), icon: CalendarCheck2 },
    { label: "Perlu Maintenance", value: String(stats.perluMaintenance), icon: Wrench },
    { label: "Nilai Booking Terkonfirmasi", value: formatRupiah(stats.nilaiTerkonfirmasi), icon: PackageCheck },
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
              <p className={cn("font-extrabold tracking-tight text-zinc-900 dark:text-white", c.value.length > 8 ? "text-lg" : "text-2xl")}>
                {c.value}
              </p>
              <p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">{c.label}</p>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <div className="border-b border-black/5 px-5 py-3.5 dark:border-white/10">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Booking Terdekat</h3>
        </div>
        {upcoming.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-400">Tidak ada booking mendatang.</p>
        ) : (
          <ul className="divide-y divide-black/5 dark:divide-white/5">
            {upcoming.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
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
  );
}
