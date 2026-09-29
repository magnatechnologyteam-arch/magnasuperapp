import Link from "next/link";
import { MapPin } from "lucide-react";
import { ChecklistProgressRing } from "@/components/events/ChecklistProgressRing";
import { GLASS_BORDER, GLASS_SURFACE } from "@/lib/glass";
import { cn } from "@/lib/cn";
import type { EventSummary } from "@/lib/events/types";

/**
 * Widget "Tracking Event" di Dashboard Hub (Tahap 50) -- permintaan Owner
 * setelah lihat cincin progres baru di Papan Tracking: "tampilin di
 * halaman utama aja biar semua divisi liat". SENGAJA dipanggil di
 * `dashboard/page.tsx` TANPA gating `visibleModuleIds` (sama seperti
 * PortfolioHighlightWidget.tsx), karena Papan Tracking Event sendiri
 * memang terbuka untuk 3 divisi operasional + akses penuh (lihat
 * middleware.ts & catatan di tracking-event/page.tsx), bukan modul milik
 * satu divisi tertentu.
 *
 * Hanya event berstatus "Berjalan" yang ditampilkan (event yang sudah
 * Selesai/Dibatalkan tidak relevan dipantau dari Hub), diurutkan tanggal
 * mulai terdekat dulu, dibatasi 6 kartu seperti widget Portofolio.
 */
export function EventTrackingHighlightWidget({ events }: { events: EventSummary[] }) {
  const ongoing = events
    .filter((ev) => ev.status === "Berjalan")
    .sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""))
    .slice(0, 6);

  if (ongoing.length === 0) return null;

  return (
    <div className="mb-8 animate-fade-up" style={{ animationDelay: "100ms" }}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Tracking Event Berjalan
        </p>
        <Link
          href="/dashboard/tracking-event"
          className="text-xs font-semibold text-violet-600 transition-colors hover:text-violet-700 dark:text-violet-300"
        >
          Lihat Semua
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ongoing.map((ev) => {
          const total = ev.checklistTotal ?? 0;
          const done = ev.checklistDone ?? 0;
          const pct = ev.checklistProgressPercent ?? 0;
          return (
            <Link
              key={ev.id}
              href={`/dashboard/tracking-event/${ev.id}`}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md",
                GLASS_SURFACE,
                GLASS_BORDER
              )}
            >
              <ChecklistProgressRing percent={pct} size={44} strokeWidth={5} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-zinc-800 dark:text-zinc-100">{ev.name}</p>
                {ev.location && (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-zinc-400 dark:text-zinc-500">
                    <MapPin className="h-3 w-3 shrink-0" /> {ev.location}
                  </p>
                )}
                <p className="mt-0.5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                  {total > 0 ? `${done}/${total} item checklist` : "Checklist belum diisi"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
