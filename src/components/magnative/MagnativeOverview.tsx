"use client";

import { useMemo } from "react";
import { Briefcase, CalendarX2, Rss, UserCheck, Wallet } from "lucide-react";
import { useMagnativeData } from "./MagnativeDataProvider";
import { formatDateID, formatRupiah, todayISO } from "@/lib/shared/utils";
import { StatCard } from "@/components/ui/StatCard";
import { DonutChart } from "@/components/ui/DonutChart";
import { EmptyState } from "@/components/ui/EmptyState";

const ACCENT_VIOLET = "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)";
const ACCENT_AMBER = "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)";
const ACCENT_CYAN = "linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)";
const ACCENT_EMERALD = "linear-gradient(135deg, #10B981 0%, #22D3EE 100%)";

/**
 * Ringkasan modul Magnative: kartu KPI (dengan bar proporsi dari data
 * asli) + donut distribusi status proyek + daftar proyek & konten
 * terdekat. Semua angka dihitung langsung dari state di
 * MagnativeDataProvider.
 */
export function MagnativeOverview() {
  const { clients, projects, contentPosts } = useMagnativeData();

  const stats = useMemo(() => {
    const klienAktif = clients.filter((c) => c.status === "Aktif").length;
    const proyekBerjalan = projects.filter((p) => p.status === "Berjalan").length;
    const kontenBelumTayang = contentPosts.filter((p) => p.status !== "Tayang").length;
    const kontenTayang = contentPosts.filter((p) => p.status === "Tayang").length;
    const budgetBerjalan = projects
      .filter((p) => p.status === "Berjalan" || p.status === "Perencanaan")
      .reduce((sum, p) => sum + p.budget, 0);
    const budgetTotal = projects.reduce((sum, p) => sum + p.budget, 0);
    const statusCounts = {
      Perencanaan: projects.filter((p) => p.status === "Perencanaan").length,
      Berjalan: projects.filter((p) => p.status === "Berjalan").length,
      Selesai: projects.filter((p) => p.status === "Selesai").length,
      Dibatalkan: projects.filter((p) => p.status === "Dibatalkan").length,
    };
    return { klienAktif, proyekBerjalan, kontenBelumTayang, kontenTayang, budgetBerjalan, budgetTotal, statusCounts };
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Klien Aktif"
          value={String(stats.klienAktif)}
          icon={UserCheck}
          accent={ACCENT_VIOLET}
          ratio={
            clients.length > 0
              ? { value: stats.klienAktif, total: clients.length, caption: `dari ${clients.length} total klien` }
              : undefined
          }
        />
        <StatCard
          label="Proyek Berjalan"
          value={String(stats.proyekBerjalan)}
          icon={Briefcase}
          accent={ACCENT_AMBER}
          delayMs={60}
          ratio={
            projects.length > 0
              ? { value: stats.proyekBerjalan, total: projects.length, caption: `dari ${projects.length} total proyek` }
              : undefined
          }
        />
        <StatCard
          label="Konten Belum Tayang"
          value={String(stats.kontenBelumTayang)}
          icon={Rss}
          accent={ACCENT_CYAN}
          delayMs={120}
          ratio={
            contentPosts.length > 0
              ? { value: stats.kontenTayang, total: contentPosts.length, caption: `${stats.kontenTayang} sudah tayang` }
              : undefined
          }
        />
        <StatCard
          label="Budget Proyek Aktif"
          value={formatRupiah(stats.budgetBerjalan)}
          icon={Wallet}
          accent={ACCENT_EMERALD}
          delayMs={180}
          ratio={
            stats.budgetTotal > 0
              ? { value: stats.budgetBerjalan, total: stats.budgetTotal, caption: `dari total ${formatRupiah(stats.budgetTotal)}` }
              : undefined
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="border-b border-black/5 px-5 py-3.5 dark:border-white/10">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Distribusi Status Proyek</h3>
          </div>
          <div className="px-5 py-5">
            <DonutChart
              data={[
                { label: "Perencanaan", value: stats.statusCounts.Perencanaan, color: "#0ea5e9" },
                { label: "Berjalan", value: stats.statusCounts.Berjalan, color: "#f59e0b" },
                { label: "Selesai", value: stats.statusCounts.Selesai, color: "#71717a" },
                { label: "Dibatalkan", value: stats.statusCounts.Dibatalkan, color: "#f43f5e" },
              ]}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:col-span-2 sm:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <div className="border-b border-black/5 px-5 py-3.5 dark:border-white/10">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Proyek Terdekat</h3>
            </div>
            {upcomingProjects.length === 0 ? (
              <EmptyState icon={CalendarX2} title="Tidak ada proyek mendatang" />
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
              <EmptyState icon={Rss} title="Tidak ada konten terjadwal" />
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
    </div>
  );
}
