import type { BoothProject, MaterialItem } from "./types";
import { ACTIVE_BOOTH_STATUSES } from "./availability";

/**
 * Forecast reuse material ke depan (analisis-kompetitor #217) — heuristik
 * NON-AI murni: jendela tanggal (lookahead) + pencocokan silang aritmatika
 * sederhana antara proyek aktif yang akan bongkar (`tanggalBongkarEstimasi`,
 * migrasi 0077) dengan proyek aktif lain yang butuh material yang sama
 * sebelum tanggal instalasinya. TIDAK ADA panggilan AI/LLM di modul ini —
 * murni perbandingan tanggal ISO string + penjumlahan qty.
 */

export const DEFAULT_LOOKAHEAD_DAYS = 60;

export type MaterialAvailabilityForecast = {
  materialId: string;
  materialName: string;
  fromProjectId: string;
  fromProjectName: string;
  tanggalBongkarEstimasi: string;
  qtyAkanTersedia: number;
};

export type ReuseForecastMatch = {
  materialId: string;
  materialName: string;
  fromProjectId: string;
  fromProjectName: string;
  tanggalBongkarEstimasi: string;
  qtyAkanTersedia: number;
  toProjectId: string;
  toProjectName: string;
  tanggalInstalasi: string;
  qtyDibutuhkan: number;
  /** true kalau stok gudang saat ini SUDAH tidak cukup untuk proyek penerima — material bongkaran ini benar-benar dibutuhkan, bukan cuma "lumayan ada". */
  adaKekuranganStok: boolean;
};

function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Daftar material yang diperkirakan bebas (siap dipakai ulang) dari proyek
 * aktif yang tanggal bongkarnya jatuh di antara hari ini s/d N hari ke
 * depan. Proyek tanpa `tanggalBongkarEstimasi` diisi (field opsional)
 * otomatis diabaikan — tidak ada default/tebakan tanggal.
 */
export function forecastMaterialAvailability(
  projects: BoothProject[],
  materials: MaterialItem[],
  todayISODate: string,
  lookaheadDays: number = DEFAULT_LOOKAHEAD_DAYS
): MaterialAvailabilityForecast[] {
  const windowEnd = addDaysISO(todayISODate, lookaheadDays);
  const materialName = (id: string) => materials.find((m) => m.id === id)?.name ?? "(material sudah dihapus)";

  const result: MaterialAvailabilityForecast[] = [];
  for (const p of projects) {
    if (!ACTIVE_BOOTH_STATUSES.includes(p.status)) continue;
    const tgl = p.tanggalBongkarEstimasi;
    if (!tgl || tgl < todayISODate || tgl > windowEnd) continue;

    for (const usage of p.materials) {
      if (usage.qty <= 0) continue;
      result.push({
        materialId: usage.materialId,
        materialName: materialName(usage.materialId),
        fromProjectId: p.id,
        fromProjectName: p.name,
        tanggalBongkarEstimasi: tgl,
        qtyAkanTersedia: usage.qty,
      });
    }
  }

  return result.sort((a, b) => a.tanggalBongkarEstimasi.localeCompare(b.tanggalBongkarEstimasi));
}

/**
 * Cocokkan tiap material yang akan bebas (lihat `forecastMaterialAvailability`)
 * dengan proyek aktif LAIN yang juga butuh material itu dan tanggal
 * instalasinya masih di atas/sama dengan tanggal bongkar si material asal
 * (supaya waktu bongkar-pasangnya logis — material harus sudah bebas
 * sebelum dibutuhkan lagi). Hasil diurutkan: yang penerimanya sedang
 * kekurangan stok gudang ditaruh duluan (paling actionable), lalu yang
 * tanggal bongkarnya paling dekat.
 */
export function findReuseForecastMatches(
  projects: BoothProject[],
  materials: MaterialItem[],
  todayISODate: string,
  lookaheadDays: number = DEFAULT_LOOKAHEAD_DAYS
): ReuseForecastMatch[] {
  const availability = forecastMaterialAvailability(projects, materials, todayISODate, lookaheadDays);
  if (availability.length === 0) return [];

  const activeProjects = projects.filter((p) => ACTIVE_BOOTH_STATUSES.includes(p.status));
  const stockById = new Map(materials.map((m) => [m.id, m.stock]));
  const matches: ReuseForecastMatch[] = [];

  for (const avail of availability) {
    for (const recipient of activeProjects) {
      if (recipient.id === avail.fromProjectId) continue;
      const usage = recipient.materials.find((m) => m.materialId === avail.materialId);
      if (!usage || usage.qty <= 0) continue;
      // Material baru "logis" dipakai ulang kalau bebasnya (tanggal bongkar
      // proyek asal) jatuh sebelum atau bertepatan dengan deadline
      // instalasi proyek penerima -- kalau setelahnya, sudah terlambat.
      if (avail.tanggalBongkarEstimasi > recipient.tanggalInstalasi) continue;

      const stokGudang = stockById.get(avail.materialId) ?? 0;
      matches.push({
        materialId: avail.materialId,
        materialName: avail.materialName,
        fromProjectId: avail.fromProjectId,
        fromProjectName: avail.fromProjectName,
        tanggalBongkarEstimasi: avail.tanggalBongkarEstimasi,
        qtyAkanTersedia: avail.qtyAkanTersedia,
        toProjectId: recipient.id,
        toProjectName: recipient.name,
        tanggalInstalasi: recipient.tanggalInstalasi,
        qtyDibutuhkan: usage.qty,
        adaKekuranganStok: stokGudang < usage.qty,
      });
    }
  }

  return matches.sort((a, b) => {
    if (a.adaKekuranganStok !== b.adaKekuranganStok) return a.adaKekuranganStok ? -1 : 1;
    return a.tanggalBongkarEstimasi.localeCompare(b.tanggalBongkarEstimasi);
  });
}
