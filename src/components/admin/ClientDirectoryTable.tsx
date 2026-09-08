"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Building2, Boxes, Palette, Hammer } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRupiah } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";

export type ClientHistoryItem = {
  id: string;
  label: string;
  value: number;
  status: string;
  date: string;
};

export type ClientSummary = {
  id: string;
  name: string;
  industry: string;
  status: string;
  totalValue: number;
  bookings: ClientHistoryItem[];
  magnativeProjects: ClientHistoryItem[];
  boothProjects: ClientHistoryItem[];
};

const CLIENT_STATUS_BADGE: Record<string, string> = {
  Prospek: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Aktif: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Selesai: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  "Tidak Lanjut": "bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400",
};

function formatTanggal(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function ModuleGroup({
  icon: Icon,
  label,
  accent,
  items,
}: {
  icon: typeof Boxes;
  label: string;
  accent: string;
  items: ClientHistoryItem[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className={cn("flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider", accent)}>
        <Icon className="h-3.5 w-3.5" />
        {label}
        <span className="text-zinc-400 dark:text-zinc-500">({items.length})</span>
      </div>
      <div className="mt-1.5 space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-lg bg-zinc-50 px-3 py-1.5 text-xs dark:bg-white/5"
          >
            <span className="font-medium text-zinc-700 dark:text-zinc-200">{item.label}</span>
            <span className="text-zinc-400 dark:text-zinc-500">{formatTanggal(item.date)}</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-500 shadow-sm dark:bg-zinc-900 dark:text-zinc-400">
              {item.status}
            </span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-100">{formatRupiah(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Tabel "Direktori Klien Terpadu" — tiap baris klien bisa dibuka (expand)
 * untuk lihat rincian booking Magnarent, proyek Magnative, dan proyek booth
 * Production yang tertaut ke klien itu (lewat `client_id`, migrasi 0010).
 *
 * Klien yang belum punya riwayat di modul manapun (baru didaftarkan lewat
 * Magnative, belum pernah dipilih di form Magnarent/Production) tetap
 * tampil di tabel dengan nilai Rp 0 — itu wajar, bukan bug.
 */
export function ClientDirectoryTable({ clients }: { clients: ClientSummary[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
      {clients.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Belum ada klien terdaftar"
          description="Tambahkan klien lewat modul Magnative — klien akan otomatis muncul di sini dan bisa ditautkan ke booking Magnarent & proyek booth Production."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:border-white/10 dark:text-zinc-500">
                <th className="px-5 py-3">Klien</th>
                <th className="px-5 py-3">Industri</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Modul Terhubung</th>
                <th className="px-5 py-3 text-right">Total Nilai</th>
                <th className="px-5 py-3 text-right">Rincian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {clients.map((client) => {
                const isOpen = expanded.has(client.id);
                const moduleCount =
                  Number(client.bookings.length > 0) +
                  Number(client.magnativeProjects.length > 0) +
                  Number(client.boothProjects.length > 0);
                return (
                  <Fragment key={client.id}>
                    <tr
                      className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-white/5"
                      onClick={() => toggle(client.id)}
                    >
                      <td className="px-5 py-3 font-semibold text-zinc-800 dark:text-zinc-100">{client.name}</td>
                      <td className="px-5 py-3 text-sm text-zinc-600 dark:text-zinc-300">{client.industry}</td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                            CLIENT_STATUS_BADGE[client.status] ?? "bg-zinc-100 text-zinc-600"
                          )}
                        >
                          {client.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {moduleCount > 1 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                            {moduleCount} lini bisnis
                          </span>
                        ) : moduleCount === 1 ? (
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">1 lini bisnis</span>
                        ) : (
                          <span className="text-xs text-zinc-300 dark:text-zinc-600">Belum ada</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-zinc-800 dark:text-zinc-100">
                        {formatRupiah(client.totalValue)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          title={isOpen ? "Tutup rincian" : "Lihat rincian"}
                          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
                        >
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-zinc-50/60 dark:bg-white/[0.02]">
                        <td colSpan={6} className="px-5 py-4">
                          {moduleCount === 0 ? (
                            <p className="text-xs text-zinc-400 dark:text-zinc-500">
                              Klien ini belum ditautkan ke booking atau proyek manapun.
                            </p>
                          ) : (
                            <div className="grid gap-3 sm:grid-cols-3">
                              <ModuleGroup
                                icon={Boxes}
                                label="Magnarent"
                                accent="text-sky-600 dark:text-sky-400"
                                items={client.bookings}
                              />
                              <ModuleGroup
                                icon={Palette}
                                label="Magnative"
                                accent="text-fuchsia-600 dark:text-fuchsia-400"
                                items={client.magnativeProjects}
                              />
                              <ModuleGroup
                                icon={Hammer}
                                label="Production"
                                accent="text-orange-600 dark:text-orange-400"
                                items={client.boothProjects}
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
