import { redirect } from "next/navigation";
import Link from "next/link";
import { History } from "lucide-react";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";

type ActivityRow = {
  id: string;
  actor_name: string;
  division: string;
  module: string;
  action: string;
  entity_type: string;
  entity_label: string | null;
  detail: string | null;
  created_at: string;
};

const MODULE_LABEL: Record<string, string> = {
  magnarent: "Magnarent",
  magnative: "Magnative",
  production: "Production",
  admin: "Admin",
};

const MODULE_BADGE: Record<string, string> = {
  magnarent: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  magnative: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
  production: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
  admin: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
};

const ACTION_LABEL: Record<string, string> = {
  create: "Tambah",
  update: "Ubah",
  delete: "Hapus",
  status_change: "Ubah Status",
};

const ACTION_BADGE: Record<string, string> = {
  create: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  update: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  delete: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
  status_change: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300",
};

const MODULE_FILTERS = ["magnarent", "magnative", "production", "admin"] as const;

function formatWaktu(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Halaman "Aktivitas" — log audit lintas modul, HANYA untuk akun akses
 * penuh (division "all"), sama seperti "Kelola Pengguna" & "Laporan".
 * Sumbernya tabel `activity_log` (migrasi 0008) yang diisi Server Action
 * tiap modul lewat `logActivity()` (src/lib/activity/log.ts) — baris di
 * sini TIDAK BISA diubah/dihapus lewat aplikasi (tidak ada tombol edit),
 * konsisten dengan RLS yang cuma mengizinkan select+insert.
 */
export default async function AktivitasPage({
  searchParams,
}: {
  searchParams: Promise<{ modul?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile || profile.division !== "all") {
    redirect("/dashboard");
  }

  const { modul } = await searchParams;
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
            Siapa mengubah apa dan kapan, di ketiga divisi.
          </p>
        </div>
      </div>

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

      <div className="mt-5 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        {rows.length === 0 ? (
          <EmptyState
            icon={History}
            title="Belum ada aktivitas tercatat"
            description="Aktivitas baru (tambah, ubah, hapus, ubah status) di ketiga modul akan muncul di sini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:border-white/10 dark:text-zinc-500">
                  <th className="px-5 py-3">Waktu</th>
                  <th className="px-5 py-3">Modul</th>
                  <th className="px-5 py-3">Aksi</th>
                  <th className="px-5 py-3">Entitas</th>
                  <th className="px-5 py-3">Pelaku</th>
                  <th className="px-5 py-3">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {formatWaktu(row.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-semibold",
                          MODULE_BADGE[row.module] ?? "bg-zinc-100 text-zinc-600"
                        )}
                      >
                        {MODULE_LABEL[row.module] ?? row.module}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-semibold",
                          ACTION_BADGE[row.action] ?? "bg-zinc-100 text-zinc-600"
                        )}
                      >
                        {ACTION_LABEL[row.action] ?? row.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-zinc-700 dark:text-zinc-200">
                      <span className="font-semibold">{row.entity_label ?? "—"}</span>
                      <span className="ml-1.5 text-xs text-zinc-400 dark:text-zinc-500">({row.entity_type})</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                      {row.actor_name}
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-500 dark:text-zinc-400">{row.detail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
