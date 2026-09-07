"use client";

import { useMemo } from "react";
import { Briefcase, Rss, UserCheck, Wallet } from "lucide-react";
import { useMagnativeData } from "./MagnativeDataProvider";
import { formatDateID, formatRupiah, todayISO } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";

const GRADIENT = "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)";

/**
 * Ringkasan modul Magnative: kartu KPI + daftar proyek dan konten terdekat.
 * Semua angka dihitung langsung dari state di MagnativeDataProvider.
 */
export function MagnativeOverview() {
  const { clients, projects, contentPosts } = useMagnativeData();

  const stats = useMemo(() => {
    const klienAktif = clients.filter((c) => c.status === "Aktif").length;
    const proyekBerjalan = projects.filter((p) => p.status === "Berjalan").length;
    const konten = contentPosts.filter((p) => p.status !== "Tayang").length;
    const budgetBerjalan = projects
      .filter((p) => p.status === "Berjalan" || p.status === "Perencanaan")
      .reduce((sum, p) => sum + p.budget, 0);
    return { klienAktif, proyekBerjalan, konten, budgetBerjalan };
  }, [clients, projects, contentPosts]);

  const upcomingProjects = useMemo(() => {
    const today = todayISO();
    return projects
      .filter((p) => p.tanggalSelesai >= today && p.status !== "Dibatalkan" && p.status !== "Selesai")
      .sort((a, b) => a.tanggalMulai.localeCompare(b.tanggalMulai))
      .slice(0, 5);
  }, [projects]);

  const upcomingPosts = useMemo(() => {
    const today = todayISO();
    return contentPosts
      .filter((p) => p.tanggalPosting >= today && p.status !== "Tayang")
      .sort((a, b) => a.tanggalPosting.localeCompare(b.tanggalPosting))
      .slice(0, 5);
  }, [contentPosts]);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";

  const cards = [
    { label: "Klien Aktif", value: String(stats.klienAktif), icon: UserCheck },
    { label: "Proyek Berjalan", value: String(stats.proyekBerjalan), icon: Briefcase },
    { label: "Konten Belum Tayang", value: String(stats.konten), icon: Rss },
    { label: "Budget Proyek Aktif", value: formatRupiah(stats.budgetBerjalan), icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900"
            >
              <div
                className="mb-3 grid h-10 w-10 place-items-center rounded-xl text-white"
                style={{ background: GRADIENT }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <p className={cn("font-extrabold tracking-tight text-zinc-900 dark:text-white", c.value.length > 8 ? "text-lg" : "text-2xl")}>
                {c.value}
              </p>
              <p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">{c.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="border-b border-black/5 px-5 py-3.5 dark:border-white/10">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Proyek Terdekat</h3>
          </div>
          {upcomingProjects.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-zinc-400">Tidak ada proyek mendatang.</p>
          ) : (
            <ul className="divide-y divide-black/5 dark:divide-white/5">
              {upcomingProjects.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{p.name}</p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{clientName(p.clientId)}</p>
                  </div>
                  <p className="shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {formatDateID(p.tanggalMulai)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="border-b border-black/5 px-5 py-3.5 dark:border-white/10">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Konten Terdekat</h3>
          </div>
          {upcomingPosts.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-zinc-400">Tidak ada konten terjadwal.</p>
          ) : (
            <ul className="divide-y divide-black/5 dark:divide-white/5">
              {upcomingPosts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{p.title}</p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{p.platform}</p>
                  </div>
                  <p className="shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {formatDateID(p.tanggalPosting)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
