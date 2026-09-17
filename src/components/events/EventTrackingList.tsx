"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, ClipboardList, MapPin } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { EVENT_STATUSES, type EventStatus, type EventSummary } from "@/lib/events/types";

const STATUS_BADGE: Record<EventStatus, string> = {
  Berjalan: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Selesai: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Dibatalkan: "bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400",
};

const FILTERS: { key: EventStatus | "semua"; label: string }[] = [
  { key: "Berjalan", label: "Berjalan" },
  { key: "semua", label: "Semua" },
  ...EVENT_STATUSES.filter((s) => s !== "Berjalan").map((s) => ({ key: s, label: s })),
];

/**
 * Daftar event untuk Papan Tracking (Tahap D) -- terbuka untuk 3 divisi
 * operasional + akses penuh (lihat page.tsx), READ-ONLY (tidak ada tombol
 * "Buat Event Baru" seperti EventList.tsx punya Admin -- bikin/hapus event
 * tetap khusus Admin, di sini cuma pintu masuk ke checklist untuk update
 * status & PIC). Default filter "Berjalan" supaya staf langsung lihat
 * event yang sedang aktif, bukan tenggelam di antara event lama.
 */
export function EventTrackingList({ events }: { events: EventSummary[] }) {
  const [filter, setFilter] = useState<EventStatus | "semua">("Berjalan");

  const filtered = useMemo(
    () => (filter === "semua" ? events : events.filter((ev) => ev.status === filter)),
    [events, filter]
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
              filter === f.key
                ? "border-violet-500 bg-violet-50 text-violet-700 dark:border-violet-400 dark:bg-violet-500/10 dark:text-violet-300"
                : "border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={ClipboardList}
            title="Tidak ada event"
            description={
              filter === "semua"
                ? "Belum ada event yang dibuat Admin."
                : `Tidak ada event dengan status "${filter}" saat ini.`
            }
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ev) => (
            <Link
              key={ev.id}
              href={`/dashboard/tracking-event/${ev.id}`}
              className="rounded-2xl border border-zinc-200 bg-white p-4 transition-colors hover:border-violet-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-violet-700"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-zinc-900 dark:text-white">{ev.name}</h3>
                <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", STATUS_BADGE[ev.status])}>
                  {ev.status}
                </span>
              </div>
              {ev.clientName && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{ev.clientName}</p>}
              <div className="mt-2.5 space-y-1 text-xs text-zinc-400 dark:text-zinc-500">
                {ev.eventTypeName && <p>Jenis: {ev.eventTypeName}</p>}
                {ev.location && (
                  <p className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {ev.location}
                  </p>
                )}
                {(ev.startDate || ev.endDate) && (
                  <p className="flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    {ev.startDate ?? "?"} – {ev.endDate ?? "?"}
                  </p>
                )}
              </div>
              {typeof ev.checklistTotal === "number" && ev.checklistTotal > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                    <span>
                      {ev.checklistDone ?? 0}/{ev.checklistTotal} item
                    </span>
                    <span>{Math.round(((ev.checklistDone ?? 0) / ev.checklistTotal) * 100)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                      style={{ width: `${Math.round(((ev.checklistDone ?? 0) / ev.checklistTotal) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
