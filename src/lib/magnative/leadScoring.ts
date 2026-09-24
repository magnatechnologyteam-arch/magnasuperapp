import type { PipelineFile, Project } from "./types";

/**
 * Lead scoring rule-based pada pipeline proposal ("Pitching") -- rekomendasi
 * Bagian 5-B #8 laporan riset kompetitor 24 Sep 2026: "Lead scoring
 * otomatis pada pipeline client berdasarkan sumberUndangan, nilai kontrak
 * historis, dan kecepatan respons." SENGAJA rule-based/heuristik dengan
 * bobot & ambang batas eksplisit di bawah -- BUKAN model AI/ML (semua fitur
 * berbasis AI ditunda per keputusan Owner). Dipakai untuk memprioritaskan
 * follow-up: makin tinggi skor, makin layak didahulukan staf sales.
 *
 * Tiga komponen (total maks 100):
 * 1. `sourcePoints` (maks 40) -- undangan LANGSUNG dari Client historis
 *    lebih sering closing dibanding lewat Brand/pihak ketiga (papan tulis
 *    SOP Owner membedakan dua alur ini sejak tahap paling awal).
 * 2. `historyPoints` (maks 35) -- total nilai kontrak (budget) proyek lain
 *    milik klien yang sama yang SUDAH/SEDANG berjalan (bukan Pitching/
 *    Dibatalkan) -- klien besar/berulang diprioritaskan.
 * 3. `momentumPoints` (maks 25) -- kecepatan respons, didekati dari seberapa
 *    baru aktivitas pipeline terakhir (upload file tahap Invitation/
 *    Briefing/Submit/Present) -- makin baru, makin "panas" leadnya.
 */
export type LeadScoreBreakdown = {
  sourcePoints: number;
  historyPoints: number;
  momentumPoints: number;
};

export type LeadScoreLabel = "Tinggi" | "Sedang" | "Rendah";

export type LeadScoreResult = {
  score: number;
  label: LeadScoreLabel;
  breakdown: LeadScoreBreakdown;
};

const HISTORY_ACTIVE_STATUSES: Project["status"][] = ["Selesai", "Berjalan"];

export function computeLeadScore(
  project: Project,
  allProjects: Project[],
  allPipelineFiles: PipelineFile[]
): LeadScoreResult {
  const sourcePoints = project.sumberUndangan === "Client" ? 40 : project.sumberUndangan === "Brand" ? 20 : 10;

  const historicalValue = allProjects
    .filter(
      (p) => p.clientId === project.clientId && p.id !== project.id && HISTORY_ACTIVE_STATUSES.includes(p.status)
    )
    .reduce((sum, p) => sum + p.budget, 0);

  const historyPoints =
    historicalValue >= 100_000_000 ? 35 : historicalValue >= 50_000_000 ? 25 : historicalValue >= 10_000_000 ? 15 : historicalValue > 0 ? 5 : 0;

  const projectFiles = allPipelineFiles.filter((f) => f.projectId === project.id);
  let momentumPoints = 5;
  if (projectFiles.length > 0) {
    const latestCreatedAt = projectFiles.reduce(
      (max, f) => (f.createdAt > max ? f.createdAt : max),
      projectFiles[0].createdAt
    );
    const daysSince = (Date.now() - new Date(latestCreatedAt).getTime()) / (1000 * 60 * 60 * 24);
    momentumPoints = daysSince <= 3 ? 25 : daysSince <= 7 ? 15 : daysSince <= 14 ? 8 : 0;
  }

  const score = Math.min(100, sourcePoints + historyPoints + momentumPoints);
  const label: LeadScoreLabel = score >= 70 ? "Tinggi" : score >= 40 ? "Sedang" : "Rendah";

  return { score, label, breakdown: { sourcePoints, historyPoints, momentumPoints } };
}

export const LEAD_SCORE_LABEL_STYLE: Record<LeadScoreLabel, string> = {
  Tinggi: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Sedang: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Rendah: "bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400",
};
