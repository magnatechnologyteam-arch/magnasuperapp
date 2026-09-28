import type { BoothProject, MaterialItem } from "./types";
import { ACTIVE_BOOTH_STATUSES, getAllocatedQty } from "./availability";

/**
 * Autoschedule heuristik crew & material lintas proyek paralel
 * (analisis-kompetitor #22, "ala Fulcrum Autoschedule" tapi versi
 * NON-AI -- murni heuristik overlap tanggal + EDF (earliest-deadline-first)
 * ranking, sama semangat dengan findCrewConflicts di magnarent). Tidak ada
 * panggilan AI/LLM sama sekali di sini.
 *
 * Prioritas proyek = tanggalInstalasi paling dekat duluan (EDF): proyek
 * yang deadline instalasinya lebih dekat "menang" alokasi kru/material
 * saat terjadi rebutan, proyek lain diberi tanda perlu penyesuaian.
 */

/** Dua rentang tanggal ISO (YYYY-MM-DD) tumpang tindih -- inklusif kedua ujung. */
export function dateRangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/** Proyek aktif diurutkan EDF -- proyek indeks lebih kecil = prioritas lebih tinggi. */
export function rankActiveProjectsByPriority(projects: BoothProject[]): BoothProject[] {
  return projects
    .filter((p) => ACTIVE_BOOTH_STATUSES.includes(p.status))
    .slice()
    .sort((a, b) => a.tanggalInstalasi.localeCompare(b.tanggalInstalasi));
}

export type CrewScheduleConflict = {
  crewName: string;
  keepProjectId: string;
  keepProjectName: string;
  keepDeadline: string;
  atRiskProjectId: string;
  atRiskProjectName: string;
  atRiskDeadline: string;
};

export type ProjectCrewRef = { projectId: string; nama: string };

/**
 * Untuk tiap pasangan proyek aktif yang jadwalnya tumpang tindih (rentang
 * tanggalMulai..tanggalInstalasi), cek apakah ada nama kru yang sama
 * ditugaskan ke keduanya. Proyek dengan deadline instalasi lebih dekat
 * (EDF) direkomendasikan "keep", proyek lain ditandai "at risk" -- perlu
 * kru pengganti. Perbandingan nama case-insensitive & di-trim, sama pola
 * dengan findCrewConflicts di magnarent/extras-actions.ts.
 */
export function findCrewScheduleConflicts(
  projects: BoothProject[],
  crewByProject: ProjectCrewRef[]
): CrewScheduleConflict[] {
  const ranked = rankActiveProjectsByPriority(projects);
  const conflicts: CrewScheduleConflict[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < ranked.length; i++) {
    for (let j = i + 1; j < ranked.length; j++) {
      const higher = ranked[i];
      const lower = ranked[j];
      if (!dateRangesOverlap(higher.tanggalMulai, higher.tanggalInstalasi, lower.tanggalMulai, lower.tanggalInstalasi)) {
        continue;
      }
      const higherCrew = new Set(
        crewByProject.filter((c) => c.projectId === higher.id).map((c) => c.nama.trim().toLowerCase())
      );
      const lowerCrewNames = crewByProject.filter((c) => c.projectId === lower.id);
      for (const c of lowerCrewNames) {
        const key = c.nama.trim().toLowerCase();
        if (!key || !higherCrew.has(key)) continue;
        const dedupeKey = `${key}|${higher.id}|${lower.id}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        conflicts.push({
          crewName: c.nama,
          keepProjectId: higher.id,
          keepProjectName: higher.name,
          keepDeadline: higher.tanggalInstalasi,
          atRiskProjectId: lower.id,
          atRiskProjectName: lower.name,
          atRiskDeadline: lower.tanggalInstalasi,
        });
      }
    }
  }
  return conflicts;
}

export type MaterialPressure = {
  materialId: string;
  materialName: string;
  stock: number;
  totalRequested: number;
  shortfall: number;
  /** Proyek-proyek yang minta material ini, diurutkan EDF (prioritas tertinggi duluan). */
  affected: { projectId: string; projectName: string; tanggalInstalasi: string; qty: number; priorityRank: number }[];
};

/**
 * Material yang dipakai 2+ proyek aktif SEKALIGUS totalnya melebihi stok --
 * dipecah per proyek dengan urutan EDF supaya jelas proyek mana yang
 * "menang" alokasi (rank 1 = prioritas tertinggi) dan mana yang perlu
 * dicarikan alternatif/PO tambahan.
 */
export function findMaterialPressure(projects: BoothProject[], materials: MaterialItem[]): MaterialPressure[] {
  const ranked = rankActiveProjectsByPriority(projects);
  const rankById = new Map(ranked.map((p, idx) => [p.id, idx + 1]));
  const pressures: MaterialPressure[] = [];

  for (const material of materials) {
    const totalRequested = getAllocatedQty(material.id, ranked);
    if (totalRequested <= material.stock) continue;

    const affected = ranked
      .map((p) => {
        const usage = p.materials.find((m) => m.materialId === material.id);
        if (!usage || usage.qty <= 0) return null;
        return {
          projectId: p.id,
          projectName: p.name,
          tanggalInstalasi: p.tanggalInstalasi,
          qty: usage.qty,
          priorityRank: rankById.get(p.id) ?? 999,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.priorityRank - b.priorityRank);

    if (affected.length < 2) continue;

    pressures.push({
      materialId: material.id,
      materialName: material.name,
      stock: material.stock,
      totalRequested,
      shortfall: totalRequested - material.stock,
      affected,
    });
  }

  return pressures;
}
