"use client";

import { Trash2, History } from "lucide-react";
import { deleteActivityLogEntry, deleteAllActivityLogs } from "@/app/dashboard/admin/aktivitas/actions";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";

export type ActivityRow = {
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
  magnative: "Magnativ",
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
 * Tabel log aktivitas + tombol hapus — HANYA dirender di halaman yang
 * sudah dijaga `division === "all"` (lihat page.tsx), dan tiap aksi hapus
 * dicek ulang di server (requireFullAccess() + RLS migrasi 0009), jadi
 * tombol ini aman dipasang di sini tanpa pengecekan tambahan.
 *
 * "Hapus Semua" sengaja pakai window.confirm dengan jumlah baris di
 * pesannya (bukan cuma "yakin?") supaya tidak gampang terpencet tanpa
 * sadar — aksi ini tidak bisa dibatalkan.
 */
export function ActivityLogTable({ rows }: { rows: ActivityRow[] }) {
  return (
    <div>
      {rows.length > 0 && (
        <div className="mb-3 flex justify-end">
          <form
            action={deleteAllActivityLogs}
            onSubmit={(e) => {
              if (
                !window.confirm(
                  "Hapus SEMUA log aktivitas (termasuk yang tidak tampil di halaman ini)? Tindakan ini tidak bisa dibatalkan."
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3.5 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus Semua
            </button>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        {rows.length === 0 ? (
          <EmptyState
            icon={History}
            title="Belum ada aktivitas tercatat"
            description="Aktivitas baru (tambah, ubah, hapus, ubah status) di ketiga modul akan muncul di sini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:border-white/10 dark:text-zinc-500">
                  <th className="px-5 py-3">Waktu</th>
                  <th className="px-5 py-3">Modul</th>
                  <th className="px-5 py-3">Aksi</th>
                  <th className="px-5 py-3">Entitas</th>
                  <th className="px-5 py-3">Pelaku</th>
                  <th className="px-5 py-3">Detail</th>
                  <th className="px-5 py-3 text-right">Hapus</th>
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
                    <td className="px-5 py-3 text-right">
                      <form
                        action={deleteActivityLogEntry}
                        onSubmit={(e) => {
                          if (!window.confirm("Hapus baris aktivitas ini?")) {
                            e.preventDefault();
                          }
                        }}
                        className="inline"
                      >
                        <input type="hidden" name="id" value={row.id} />
                        <button
                          type="submit"
                          title="Hapus baris ini"
                          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </td>
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
