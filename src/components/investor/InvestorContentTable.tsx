import { CalendarPlus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateID } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";
import type { ContentPost } from "@/lib/magnative/types";
import { CONTENT_STATUS_STYLES as STATUS_STYLES, PLATFORM_STYLES } from "@/lib/status-styles";

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
                  <EmptyState
                    icon={CalendarPlus}
                    title="Belum ada konten"
                    description="Begitu ada jadwal konten baru dari Magnativ, langsung muncul di sini."
                  />
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
