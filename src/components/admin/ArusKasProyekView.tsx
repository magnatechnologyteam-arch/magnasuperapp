"use client";

import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, ChevronDown, Search, TrendingUp, Wallet2 } from "lucide-react";
import { formatDateID, formatRupiah } from "@/lib/shared/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { cn } from "@/lib/cn";
import type { Project } from "@/lib/magnative/types";

const ACCENT_EMERALD = "linear-gradient(135deg, #10B981 0%, #22D3EE 100%)";
const ACCENT_ROSE = "linear-gradient(135deg, #F43F5E 0%, #FB7185 100%)";
const ACCENT_AMBER = "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)";

export type ArusKasEvent = {
  id: string;
  date: string;
  type: "masuk" | "keluar";
  description: string;
  amount: number;
  /** Cuma relevan untuk type "masuk" — invoice yang belum "Lunas" belum dianggap dana yang benar-benar cair. */
  realized?: boolean;
};

export type ProyekArusKas = {
  project: Project;
  clientName: string;
  totalMasuk: number;
  totalKeluar: number;
  totalPotensi: number;
  net: number;
  timeline: ArusKasEvent[];
};

const STATUS_BADGE: Record<Project["status"], string> = {
  Pitching: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  Perencanaan: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Berjalan: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Selesai: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Dibatalkan: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

/**
 * Rincian arus kas per proyek Magnativ — jawaban langsung untuk permintaan
 * investor (diteruskan owner): "ada link yg bisa kasih kita rekapan cost
 * dan kapannya (keluar atau masuk dana)". Tiap baris proyek bisa dibuka
 * untuk lihat timeline kronologis biaya (keluar, dari
 * `magnative_project_costs`) digabung invoice (masuk, dari `invoices`)
 * lengkap dengan saldo berjalan.
 *
 * Invoice yang belum "Lunas" tetap ditampilkan di timeline (supaya
 * kelihatan sedang ditagih), tapi TIDAK ikut dihitung di saldo berjalan
 * maupun "Total Dana Masuk" — itu baru potensi, belum uang yang benar-benar
 * cair. Lihat `totalPotensi` untuk angka gabungannya.
 *
 * Diurutkan dari proyek yang paling banyak aktivitas (jumlah event
 * timeline) dulu, supaya proyek yang belum ada biaya/invoice sama sekali
 * tidak menumpuk di atas.
 */
export function ArusKasProyekView({
  data,
  grandTotalMasuk,
  grandTotalKeluar,
  grandTotalPotensi,
}: {
  data: ProyekArusKas[];
  grandTotalMasuk: number;
  grandTotalKeluar: number;
  grandTotalPotensi: number;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...data].sort(
        (a, b) => b.timeline.length - a.timeline.length || b.project.tanggalMulai.localeCompare(a.project.tanggalMulai)
      ),
    [data]
  );

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return sorted;
    return sorted.filter(
      (d) => d.project.name.toLowerCase().includes(term) || d.clientName.toLowerCase().includes(term)
    );
  }, [sorted, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Dana Masuk (Lunas)"
          value={formatRupiah(grandTotalMasuk)}
          icon={ArrowUpCircle}
          accent={ACCENT_EMERALD}
        />
        <StatCard
          label="Total Biaya Keluar"
          value={formatRupiah(grandTotalKeluar)}
          icon={ArrowDownCircle}
          accent={ACCENT_ROSE}
          delayMs={60}
        />
        <StatCard
          label="Potensi Belum Cair"
          value={formatRupiah(grandTotalPotensi)}
          icon={TrendingUp}
          accent={ACCENT_AMBER}
          delayMs={120}
        />
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari proyek atau klien…"
          className="w-full rounded-full border border-black/10 bg-white py-2 pl-9 pr-3.5 text-sm text-zinc-900 outline-none ring-violet-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Wallet2}
            title={data.length === 0 ? "Belum ada proyek Magnativ" : "Tidak ada hasil"}
            description={
              data.length === 0
                ? "Buat proyek di tab Magnativ untuk mulai melacak arus kasnya."
                : "Coba ubah kata kunci pencarian."
            }
          />
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {filtered.map((d) => {
              const isOpen = expandedId === d.project.id;
              let running = 0;

              return (
                <div key={d.project.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : d.project.id)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-white/5"
                  >
                    <ChevronDown
                      className={cn("h-4 w-4 shrink-0 text-zinc-400 transition-transform", isOpen && "rotate-180")}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                          {d.project.name}
                        </p>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            STATUS_BADGE[d.project.status]
                          )}
                        >
                          {d.project.status}
                        </span>
                      </div>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{d.clientName}</p>
                    </div>
                    <div className="hidden shrink-0 gap-6 sm:flex">
                      <div className="text-right">
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Masuk</p>
                        <p className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(d.totalMasuk)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Keluar</p>
                        <p className="text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                          {formatRupiah(d.totalKeluar)}
                        </p>
                      </div>
                      <div className="w-32 text-right">
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Net</p>
                        <p
                          className={cn(
                            "text-sm font-bold tabular-nums",
                            d.net >= 0 ? "text-zinc-900 dark:text-white" : "text-rose-600 dark:text-rose-400"
                          )}
                        >
                          {formatRupiah(d.net)}
                        </p>
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-black/5 bg-zinc-50/60 px-5 py-4 dark:border-white/5 dark:bg-white/[0.02]">
                      {d.timeline.length === 0 ? (
                        <p className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
                          Belum ada biaya atau invoice tercatat untuk proyek ini.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[520px] text-left text-xs">
                            <thead>
                              <tr className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                <th className="pb-2 pr-3">Tanggal</th>
                                <th className="pb-2 pr-3">Keterangan</th>
                                <th className="pb-2 pr-3 text-right">Nominal</th>
                                <th className="pb-2 text-right">Saldo Berjalan</th>
                              </tr>
                            </thead>
                            <tbody>
                              {d.timeline.map((ev) => {
                                const isPotential = ev.type === "masuk" && ev.realized === false;
                                running += ev.type === "keluar" ? -ev.amount : ev.realized ? ev.amount : 0;

                                return (
                                  <tr key={ev.id} className="border-t border-black/5 dark:border-white/5">
                                    <td className="whitespace-nowrap py-2 pr-3 text-zinc-500 dark:text-zinc-400">
                                      {formatDateID(ev.date)}
                                    </td>
                                    <td className="py-2 pr-3 text-zinc-700 dark:text-zinc-300">{ev.description}</td>
                                    <td
                                      className={cn(
                                        "py-2 pr-3 text-right font-medium tabular-nums",
                                        ev.type === "keluar"
                                          ? "text-rose-600 dark:text-rose-400"
                                          : isPotential
                                            ? "text-zinc-400 dark:text-zinc-500"
                                            : "text-emerald-600 dark:text-emerald-400"
                                      )}
                                    >
                                      {ev.type === "keluar" ? "-" : isPotential ? "~" : "+"}
                                      {formatRupiah(ev.amount)}
                                    </td>
                                    <td className="py-2 text-right font-semibold tabular-nums text-zinc-900 dark:text-white">
                                      {formatRupiah(running)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
