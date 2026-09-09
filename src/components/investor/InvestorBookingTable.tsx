import { BadgeCheck, Calendar } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateID, formatRupiah, getAvatarColor, getInitials } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";
import type { Booking } from "@/lib/magnarent/types";
import { BOOKING_STATUS_STYLES as STATUS_STYLES, PAYMENT_STYLES } from "@/lib/status-styles";

/**
 * Tabel booking Magnarent, versi read only untuk investor — sengaja
 * komponen server biasa (tanpa "use client"): tidak ada filter/aksi apa
 * pun di sini, jadi tidak perlu state di browser.
 */
export function InvestorBookingTable({
  rows,
}: {
  rows: { booking: Booking; itemName: string; total: number }[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
              <th className="px-5 py-3">Klien</th>
              <th className="px-5 py-3">Alat</th>
              <th className="px-5 py-3">Mulai</th>
              <th className="px-5 py-3">Selesai</th>
              <th className="px-5 py-3 text-right">Unit</th>
              <th className="px-5 py-3 text-right">Total Biaya</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Pembayaran</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <EmptyState icon={Calendar} title="Belum ada booking" description="Belum ada data yang tercatat." />
                </td>
              </tr>
            )}
            {rows.map(({ booking: b, itemName, total }) => (
              <tr key={b.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white",
                        getAvatarColor(b.namaKlien)
                      )}
                    >
                      {getInitials(b.namaKlien)}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 truncate font-medium text-zinc-900 dark:text-white">
                        <span className="truncate">{b.namaKlien}</span>
                        {b.clientId && (
                          <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-blue-500" aria-label="Klien terdaftar" />
                        )}
                      </p>
                      {b.teleponKlien && (
                        <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">{b.teleponKlien}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{itemName}</td>
                <td className="px-5 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                  {formatDateID(b.tanggalMulai)}
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                  {formatDateID(b.tanggalSelesai)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums font-semibold text-zinc-900 dark:text-white">
                  {b.jumlahUnit}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatRupiah(total)}
                </td>
                <td className="px-5 py-3">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLES[b.status])}>
                    {b.status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", PAYMENT_STYLES[b.statusPembayaran])}
                  >
                    {b.statusPembayaran}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
