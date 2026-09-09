import { CalendarPlus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateID } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";
import type { ContentPost, ContentStatus, Platform } from "@/lib/magnative/types";

const STATUS_STYLES: Record<ContentStatus, string> = {
  Draft: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
  Review: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Terjadwal: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Tayang: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
};

const PLATFORM_STYLES: Record<Platform, string> = {
  Instagram: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
  TikTok: "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-200",
  Facebook: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  YouTube: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  LinkedIn: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Lainnya: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
};

/** Tabel jadwal konten Magnativ, versi read only untuk investor. */
export function InvestorContentTable({ rows }: { rows: { post: ContentPost; clientName: string }[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
              <th className="px-5 py-3">Judul Konten</th>
              <th className="px-5 py-3">Klien</th>
              <th className="px-5 py-3">Platform</th>
              <th className="px-5 py-3">Tanggal Tayang</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyState icon={CalendarPlus} title="Belum ada konten" description="Belum ada data yang tercatat." />
                </td>
              </tr>
            )}
            {rows.map(({ post: c, clientName }) => (
              <tr key={c.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{c.title}</td>
                <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{clientName}</td>
                <td className="px-5 py-3">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", PLATFORM_STYLES[c.platform])}>
                    {c.platform}
                  </span>
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                  {formatDateID(c.tanggalPosting)}
                </td>
                <td className="px-5 py-3">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLES[c.status])}>
                    {c.status}
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
