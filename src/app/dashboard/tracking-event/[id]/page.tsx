import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { getAssignablePics, getEventById } from "@/lib/events/data";
import { EventTrackingBoard } from "@/components/events/EventTrackingBoard";

/**
 * Papan Tracking satu event (Tahap D) — lihat komentar guard divisi di
 * page.tsx satu level di atas (middleware yang menutup investor, RLS yang
 * membuka baca+update ke 3 divisi operasional + akses penuh). Kalau event
 * tidak ditemukan (id salah, atau -- secara teori -- baru dihapus Admin),
 * redirect balik ke daftar Papan Tracking.
 */
export default async function TrackingEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, picOptions] = await Promise.all([getEventById(id), getAssignablePics()]);
  if (!detail) {
    redirect("/dashboard/tracking-event");
  }

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
            Update status & PIC tiap item checklist untuk event ini.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <EventTrackingBoard
          event={detail.event}
          initialChecklistItems={detail.checklistItems}
          links={detail.links}
          picOptions={picOptions}
        />
      </div>
    </div>
  );
}
