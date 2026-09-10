import { PackageSearch } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateID, formatRupiah } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";
import type { BoothProject } from "@/lib/production/types";
import { BOOTH_STATUS_STYLES as STATUS_STYLES, PAYMENT_STYLES } from "@/lib/status-styles";

/** Tabel proyek booth Production, versi read only untuk investor. */
export function InvestorBoothTable({ projects }: { projects: BoothProject[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
              <th className="px-5 py-3">Proyek</th>
              <th className="px-5 py-3">Klien</th>
              <th className="px-5 py-3">Lokasi Acara</th>
              <th className="px-5 py-3">Deadline Instalasi</th>
              <th className="px-5 py-3 text-right">Budget</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Pembayaran</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={PackageSearch}
                    title="Belum ada proyek booth"
                    description="Begitu ada proyek booth baru dari Production, langsung muncul di sini."
                  />
                </td>
              </tr>
            )}
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{p.name}</td>
                <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{p.namaKlien}</td>
                <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{p.lokasiAcara}</td>
                <td className="px-5 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                  {formatDateID(p.tanggalInstalasi)}
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
