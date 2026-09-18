import { redirect } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getEvents, getEventTypes } from "@/lib/events/data";
import { EventList } from "@/components/events/EventList";
import { ToastProvider } from "@/components/ui/ToastProvider";

/**
 * Halaman "Event" (Tahap C modul Tracking Progress Event) -- daftar semua
 * event + tombol bikin baru, plus progress checklist per event & ringkasan
 * di atasnya (Tahap E). HANYA akses penuh (RLS `events_insert`) -- staf 3
 * divisi operasional update status/PIC lewat halaman terpisah "Papan
 * Tracking" (Tahap D, `/dashboard/tracking-event`), bukan di sini.
 */
export default async function EventsPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.division !== "all") {
    redirect("/dashboard");
  }

  const [events, eventTypes] = await Promise.all([getEvents({ withProgress: true }), getEventTypes()]);

  return (
    <div className="p-4 md:p-8">
      <div className="animate-fade-up flex items-start gap-4">
        <div className="relative shrink-0">
          <span
            className="absolute -inset-1.5 animate-pulse rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 opacity-30 blur-lg"
            aria-hidden
          />
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
            <CalendarClock className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-500 dark:text-violet-400">
            Admin — Tracking Progress Event
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Event</h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Bikin event baru dari jenis event yang sudah ditentukan, atau kosong -- lalu kaitkan ke booking/proyek
            terkait supaya ketiga divisi bisa saling memantau progresnya.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <ToastProvider>
          <EventList events={events} eventTypes={eventTypes} />
        </ToastProvider>
      </div>
    </div>
  );
}
