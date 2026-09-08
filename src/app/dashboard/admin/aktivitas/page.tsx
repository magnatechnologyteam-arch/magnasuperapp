import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, History } from "lucide-react";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { ActivityLogTable, type ActivityRow } from "@/components/admin/ActivityLogTable";
import { cn } from "@/lib/cn";

const MODULE_LABEL: Record<string, string> = {
  magnarent: "Magnarent",
  magnative: "Magnativ",
  production: "Production",
  admin: "Admin",
};

const MODULE_FILTERS = ["magnarent", "magnative", "production", "admin"] as const;

/**
 * Halaman "Aktivitas" — log audit lintas modul, HANYA untuk akun akses
 * penuh (division "all"), sama seperti "Kelola Pengguna" & "Laporan".
 * Sumbernya tabel `activity_log` (migrasi 0008) yang diisi Server Action
 * tiap modul lewat `logActivity()` (src/lib/activity/log.ts).
 *
 * Baris di sini dulunya tidak bisa dihapus lewat aplikasi sama sekali —
 * sekarang akses penuh BISA menghapus (per baris atau semua sekaligus)
 * lewat ActivityLogTable, ditambahkan lewat migrasi 0009 atas permintaan
 * eksplisit supaya log yang menumpuk bisa dibersihkan. Tetap tidak ada
 * policy UPDATE — baris yang tersisa tidak bisa diubah, cuma dihapus.
 */
export default async function AktivitasPage({
  searchParams,
}: {
  searchParams: Promise<{ modul?: string; notice?: string; error?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile || profile.division !== "all") {
    redirect("/dashboard");
  }

  const { modul, notice, error } = await searchParams;
  const activeFilter = MODULE_FILTERS.includes(modul as (typeof MODULE_FILTERS)[number]) ? modul : undefined;

  const supabase = await createClient();
  let query = supabase
    .from("activity_log")
    .select("id, actor_name, division, module, action, entity_type, entity_label, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(150);

  if (activeFilter) {
    query = query.eq("module", activeFilter);
  }

  const { data } = await query.returns<ActivityRow[]>();
  const rows = data ?? [];

  return (
    <div className="p-4 md:p-8">
      <div className="animate-fade-up flex items-start gap-4">
        <div className="relative shrink-0">
          <span
            className="absolute -inset-1.5 animate-pulse rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 opacity-30 blur-lg"
            aria-hidden
          />
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-sm">
            <History className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-500 dark:text-indigo-400">
            Admin
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Aktivitas
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Catatan semua perubahan dari tim, biar gampang dilacak siapa ngapain dan kapan.
          </p>
        </div>
      </div>

      {notice && (
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {notice}
        </div>
      )}
      {error && (
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/dashboard/admin/aktivitas"
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
            !activeFilter
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
          )}
        >
          Semua
        </Link>
        {MODULE_FILTERS.map((m) => (
          <Link
            key={m}
            href={`/dashboard/admin/aktivitas?modul=${m}`}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              activeFilter === m
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
            )}
          >
            {MODULE_LABEL[m]}
          </Link>
        ))}
      </div>

      <div className="mt-5">
        <ActivityLogTable rows={rows} />
      </div>
    </div>
  );
}
