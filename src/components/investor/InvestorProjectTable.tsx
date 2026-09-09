import { Hammer } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateID, formatRupiah } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";
import type { PaymentStatus, Project, ProjectStatus } from "@/lib/magnative/types";

const STATUS_STYLES: Record<ProjectStatus, string> = {
  Pitching: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  Perencanaan: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Berjalan: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Selesai: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Dibatalkan: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  "Belum Bayar": "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  DP: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Lunas: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
};

/** Tabel proyek Magnativ, versi read only untuk investor. */
export function InvestorProjectTable({ rows }: { rows: { project: Project; clientName: string }[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
              <th className="px-5 py-3">Proyek</th>
              <th className="px-5 py-3">Klien</th>
              <th className="px-5 py-3">Tipe</th>
              <th className="px-5 py-3">Periode</th>
              <th className="px-5 py-3 text-right">Budget</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Pembayaran</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState icon={Hammer} title="Belum ada proyek" description="Belum ada data yang tercatat." />
                </td>
              </tr>
            )}
            {rows.map(({ project: p, clientName }) => (
              <tr key={p.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{p.name}</td>
                <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{clientName}</td>
                <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{p.type}</td>
                <td className="px-5 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                  {formatDateID(p.tanggalMulai)} – {formatDateID(p.tanggalSelesai)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatRupiah(p.budget)}
                </td>
                <td className="px-5 py-3">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLES[p.status])}>
                    {p.status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", PAYMENT_STYLES[p.statusPembayaran])}
                  >
                    {p.statusPembayaran}
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
