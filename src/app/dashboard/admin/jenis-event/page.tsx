import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getAllEventTypeTemplateItems, getEventTypes } from "@/lib/events/data";
import { EventTypeManager } from "@/components/events/EventTypeManager";
import { ToastProvider } from "@/components/ui/ToastProvider";

/**
 * Halaman "Jenis Event" (Tahap B modul Tracking Progress Event) -- HANYA
 * akses penuh (Owner/Finance) yang bisa kelola jenis event & template
 * checklist-nya, konsisten dengan pola Daftar Akun di modul Akuntansi --
 * staf 3 divisi operasional baru terlibat mulai Tahap C (bikin event baru
 * dari salah satu jenis di sini) & Tahap D (isi checklist AKTUAL-nya).
 */
export default async function JenisEventPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.division !== "all") {
    redirect("/dashboard");
  }

  const [eventTypes, templateItems] = await Promise.all([getEventTypes(), getAllEventTypeTemplateItems()]);

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
            Admin — Tracking Progress Event
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Jenis Event
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Kelola daftar jenis event dan template checklist standarnya -- dipakai sebagai titik awal saat sebuah
            event baru dibuat, supaya checklist tidak perlu diketik ulang dari nol tiap kali.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <ToastProvider>
          <EventTypeManager initialEventTypes={eventTypes} initialTemplateItems={templateItems} />
        </ToastProvider>
      </div>
    </div>
  );
}
