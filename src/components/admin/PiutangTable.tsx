import { Wallet2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRupiah } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";

export type PiutangModule = "magnarent" | "magnative" | "production";
export type PiutangStatus = "Belum Bayar" | "DP";

export type PiutangRow = {
  id: string;
  module: PiutangModule;
  label: string;
  namaKlien: string;
  date: string;
  /** Sisa tagihan sesungguhnya — nilai penuh dikurangi DP yang sudah diterima. Migrasi 0015. */
  value: number;
  /** Nominal DP yang sudah diterima (Rupiah) — 0 kalau bukan status "DP". */
  dpAmount: number;
  statusPembayaran: PiutangStatus;
};

const MODULE_LABEL: Record<PiutangModule, string> = {
  magnarent: "Magnarent",
  magnative: "Magnativ",
  production: "Production",
};

const MODULE_BADGE: Record<PiutangModule, string> = {
  magnarent: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  magnative: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
  production: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
};

const PAYMENT_BADGE: Record<PiutangStatus, string> = {
  "Belum Bayar": "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  DP: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
};

function formatTanggal(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Daftar piutang (booking/proyek berstatus "Belum Bayar" atau "DP") lintas 3
 * modul, diurutkan dari tanggal PALING LAMA (paling berpotensi tertunggak)
 * — dihitung & diurutkan di `page.tsx` (Server Component), komponen ini
 * murni presentasi, tidak ada interaksi jadi tidak perlu "use client".
 *
 * Sejak migrasi 0015, `row.value` adalah SISA TAGIHAN SEBENARNYA (nilai
 * penuh dikurangi DP yang sudah diterima untuk status "DP") — bukan lagi
 * nilai penuh booking/proyek. Untuk baris yang DP-nya sudah tercatat,
 * ditampilkan juga catatan kecil berapa DP yang sudah masuk supaya tim
 * finance tetap bisa lihat nilai penuhnya kalau perlu.
 */
export function PiutangTable({ rows }: { rows: PiutangRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
      {rows.length === 0 ? (
        <EmptyState
          icon={Wallet2}
          title="Tidak ada piutang tertunda"
          description="Semua booking & proyek yang belum dibatalkan berstatus pembayaran Lunas."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:border-white/10 dark:text-zinc-500">
                <th className="px-5 py-3">Modul</th>
                <th className="px-5 py-3">Klien</th>
                <th className="px-5 py-3">Booking / Proyek</th>
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Sisa Piutang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", MODULE_BADGE[row.module])}>
                      {MODULE_LABEL[row.module]}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium text-zinc-800 dark:text-zinc-100">{row.namaKlien}</td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{row.label}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatTanggal(row.date)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        PAYMENT_BADGE[row.statusPembayaran]
                      )}
                    >
                      {row.statusPembayaran}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
                    {formatRupiah(row.value)}
                    {row.dpAmount > 0 && (
                      <p className="mt-0.5 text-[11px] font-normal text-zinc-400 dark:text-zinc-500">
                        sudah DP {formatRupiah(row.dpAmount)}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
