import { ClipboardList } from "lucide-react";
import { getEvents } from "@/lib/events/data";
import { EventTrackingList } from "@/components/events/EventTrackingList";

/**
 * Halaman "Papan Tracking" (Tahap D modul Tracking Progress Event) —
 * SENGAJA di luar prefix `/dashboard/admin|magnative|magnarent|production`
 * (lihat src/middleware.ts) supaya staf divisi manapun bisa buka langsung —
 * sama seperti "Realisasi Event" & "Chat" — kecuali Investor (diblokir
 * eksplisit di middleware). RLS `events_select`/`event_checklist_items_*`
 * (migrasi 0053) sudah membuka baca+update lintas 3 divisi operasional +
 * akses penuh sejak Tahap A, jadi halaman ini tidak perlu guard divisi
 * tambahan di sisi sini.
 */
export default async function TrackingEventPage() {
  const events = await getEvents({ withProgress: true });

  return (
    <div className="p-4 md:p-8">
      <div className="animate-fade-up flex items-start gap-4">
        <div className="relative shrink-0">
          <span
            className="absolute -inset-1.5 animate-pulse rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 opacity-30 blur-lg"
            aria-hidden
          />
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
            <ClipboardList className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-500 dark:text-violet-400">
            Tracking Progress Event
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Papan Tracking
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Pilih event untuk update status & PIC tiap item checklist — bisa diisi bersama staf Magnarent, Magnativ,
            dan Production.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <EventTrackingList events={events} />
      </div>
    </div>
  );
}
