"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { useMagnativeData } from "./MagnativeDataProvider";
import { DonutChart } from "@/components/ui/DonutChart";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Platform } from "@/lib/magnative/types";
import { PLATFORM_STYLES } from "@/lib/status-styles";
import { cn } from "@/lib/cn";

const ALL_PLATFORMS: Platform[] = ["Instagram", "TikTok", "Facebook", "YouTube", "LinkedIn", "Lainnya"];

const PLATFORM_BAR_COLOR: Record<Platform, string> = {
  Instagram: "#d946ef",
  TikTok: "#71717a",
  Facebook: "#3b82f6",
  YouTube: "#f43f5e",
  LinkedIn: "#0ea5e9",
  Lainnya: "#a1a1aa",
};

/**
 * Statistik performa konten per platform (Tahap 28b) — dihitung murni dari
 * data `magnative_content_posts` yang sudah ada (jumlah konten & berapa
 * yang sudah tayang per platform), BUKAN metrik engagement (like/view/reach)
 * karena aplikasi ini tidak terhubung ke API media sosial manapun. Ini
 * gambaran "kesehatan pipeline konten", bukan performa audiens.
 */
export function ContentStatistics() {
  const { contentPosts } = useMagnativeData();

  const perPlatform = useMemo(() => {
    return ALL_PLATFORMS.map((platform) => {
      const posts = contentPosts.filter((p) => p.platform === platform);
      const tayang = posts.filter((p) => p.status === "Tayang").length;
      return { platform, total: posts.length, tayang };
    }).filter((row) => row.total > 0);
  }, [contentPosts]);

  const statusCounts = useMemo(
    () => ({
      Draft: contentPosts.filter((p) => p.status === "Draft").length,
      Revisi: contentPosts.filter((p) => p.status === "Revisi").length,
      Disetujui: contentPosts.filter((p) => p.status === "Disetujui").length,
      Tayang: contentPosts.filter((p) => p.status === "Tayang").length,
    }),
    [contentPosts]
  );

  const maxTotal = Math.max(1, ...perPlatform.map((r) => r.total));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <div className="border-b border-black/5 px-5 py-3.5 dark:border-white/10">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Alur Approval Konten</h3>
        </div>
        <div className="px-5 py-5">
          <DonutChart
            data={[
              { label: "Draft", value: statusCounts.Draft, color: "#a1a1aa" },
              { label: "Revisi", value: statusCounts.Revisi, color: "#f59e0b" },
              { label: "Disetujui", value: statusCounts.Disetujui, color: "#0ea5e9" },
              { label: "Tayang", value: statusCounts.Tayang, color: "#10b981" },
            ]}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900 lg:col-span-2">
        <div className="border-b border-black/5 px-5 py-3.5 dark:border-white/10">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Performa Konten per Platform</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Jumlah konten & yang sudah tayang, per platform.</p>
        </div>
        {perPlatform.length === 0 ? (
          <EmptyState icon={BarChart3} title="Belum ada data konten" />
        ) : (
          <ul className="space-y-3 px-5 py-5">
            {perPlatform.map((row) => (
              <li key={row.platform}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", PLATFORM_STYLES[row.platform])}>
                    {row.platform}
                  </span>
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {row.tayang} tayang dari {row.total} konten
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(row.total / maxTotal) * 100}%`,
                      background: PLATFORM_BAR_COLOR[row.platform],
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
