import { redirect } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getEventById } from "@/lib/events/data";
import { EventDetailManager } from "@/components/events/EventDetailManager";

/**
 * Detail satu event (Tahap C) -- HANYA akses penuh (Owner/Finance), sama
 * seperti daftar event (page.tsx satu level di atas). Kalau event tidak
 * ditemukan (id salah/sudah dihapus -- meski saat ini belum ada hapus
 * event), redirect balik ke daftar daripada menampilkan halaman kosong.
 */
export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.division !== "all") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const detail = await getEventById(id);
  if (!detail) {
    redirect("/dashboard/admin/events");
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
            <CalendarClock className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-500 dark:text-violet-400">
            Admin — Tracking Progress Event
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Detail Event
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Kelola checklist dan kaitan ke data divisi untuk event ini.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <EventDetailManager
          event={detail.event}
          initialChecklistItems={detail.checklistItems}
          initialLinks={detail.links}
        />
      </div>
    </div>
  );
}
