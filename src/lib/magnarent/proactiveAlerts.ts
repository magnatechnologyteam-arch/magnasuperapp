import type { Booking, InventoryItem } from "./types";
import type { MaintenanceLog } from "./extras-types";
import { computeItemUtilization } from "./utilization";
import { todayISO } from "./date";

/**
 * Notifikasi proaktif utilisasi alat (rekomendasi Bagian 5-C #12 laporan
 * riset kompetitor 24 Sep 2026 -- "Notifikasi proaktif harian/mingguan
 * (alat idle lama, biaya maintenance naik, demand musiman) --
 * meningkatkan laporan utilisasi 90-hari yang sudah ada dari PASIF jadi
 * AKTIF"). SENGAJA rule-based, bukan AI -- dihitung ulang tiap kali
 * dashboard Magnarent dibuka (bukan cron terjadwal, supaya tidak perlu
 * infrastruktur job scheduler tambahan) sehingga staf langsung lihat alert
 * begitu masuk, tanpa perlu buka Laporan Utilisasi secara manual.
 */
const COUNTED_STATUSES: Booking["status"][] = ["Dikonfirmasi", "Selesai"];

export type ProactiveAlertType = "idle" | "biaya_naik" | "demand_naik";

export type ProactiveAlert = {
  id: string;
  itemId: string;
  itemName: string;
  type: ProactiveAlertType;
  message: string;
};

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function unitDaysInWindow(bookings: Booking[], itemId: string, windowStart: string, windowEnd: string): number {
  return bookings
    .filter((b) => b.itemId === itemId && COUNTED_STATUSES.includes(b.status))
    .reduce((sum, b) => {
      const start = b.tanggalMulai > windowStart ? b.tanggalMulai : windowStart;
      const end = b.tanggalSelesai < windowEnd ? b.tanggalSelesai : windowEnd;
      if (start > end) return sum;
      const start_d = new Date(`${start}T00:00:00Z`);
      const end_d = new Date(`${end}T00:00:00Z`);
      const days = Math.round((end_d.getTime() - start_d.getTime()) / 86_400_000) + 1;
      return sum + days * b.jumlahUnit;
    }, 0);
}

export function computeProactiveAlerts(
  inventory: InventoryItem[],
  bookings: Booking[],
  maintenanceLogs: MaintenanceLog[],
  today: string = todayISO()
): ProactiveAlert[] {
  const alerts: ProactiveAlert[] = [];

  // 1) Alat idle lama -- pakai klasifikasi tier yang sama dengan Laporan
  // Utilisasi 90 hari yang sudah ada, cuma disurfacekan otomatis di sini.
  const utilization90 = computeItemUtilization(inventory, bookings, 90, today);
  for (const u of utilization90) {
    if (u.tier === "idle") {
      const idleInfo = u.daysSinceLastUsed !== null ? `idle ${u.daysSinceLastUsed} hari` : "belum pernah tersewa";
      alerts.push({
        id: `${u.item.id}-idle`,
        itemId: u.item.id,
        itemName: u.item.name,
        type: "idle",
        message: `${u.item.name} ${idleInfo} (utilisasi 90 hari cuma ${u.utilizationPct}%) -- pertimbangkan promosi khusus atau lepas ke gudang lain.`,
      });
    }
  }

  // 2) Biaya maintenance naik -- 90 hari terakhir vs 90 hari sebelumnya.
  const windowStart = addDays(today, -89);
  const prevStart = addDays(today, -179);
  const prevEnd = addDays(today, -90);
  const recentCost = new Map<string, number>();
  const prevCost = new Map<string, number>();
  for (const log of maintenanceLogs) {
    if (log.tanggal >= windowStart && log.tanggal <= today) {
      recentCost.set(log.itemId, (recentCost.get(log.itemId) ?? 0) + log.biaya);
    } else if (log.tanggal >= prevStart && log.tanggal <= prevEnd) {
      prevCost.set(log.itemId, (prevCost.get(log.itemId) ?? 0) + log.biaya);
    }
  }
  for (const item of inventory) {
    const recent = recentCost.get(item.id) ?? 0;
    const prev = prevCost.get(item.id) ?? 0;
    const naik = prev > 0 ? recent > prev * 1.5 && recent - prev >= 200_000 : recent >= 750_000;
    if (naik) {
      alerts.push({
        id: `${item.id}-biaya_naik`,
        itemId: item.id,
        itemName: item.name,
        type: "biaya_naik",
        message: `Biaya maintenance ${item.name} naik jadi Rp${recent.toLocaleString("id-ID")} (90 hari terakhir) dari Rp${prev.toLocaleString("id-ID")} periode sebelumnya -- cek kondisi unit.`,
      });
    }
  }

  // 3) Demand naik -- unit-hari tersewa 30 hari terakhir vs 30 hari
  // sebelumnya, per alat (proksi sederhana untuk "demand musiman" tanpa
  // perlu data historis bertahun-tahun).
  const d30Start = addDays(today, -29);
  const dPrevStart = addDays(today, -59);
  const dPrevEnd = addDays(today, -30);
  for (const item of inventory) {
    const recentDemand = unitDaysInWindow(bookings, item.id, d30Start, today);
    const prevDemand = unitDaysInWindow(bookings, item.id, dPrevStart, dPrevEnd);
    const naik = prevDemand > 0 ? recentDemand > prevDemand * 1.5 && recentDemand - prevDemand >= item.totalUnit * 3 : false;
    if (naik) {
      alerts.push({
        id: `${item.id}-demand_naik`,
        itemId: item.id,
        itemName: item.name,
        type: "demand_naik",
        message: `Permintaan ${item.name} naik tajam 30 hari terakhir (${recentDemand} unit-hari vs ${prevDemand} sebelumnya) -- pertimbangkan tambah stok/subrent.`,
      });
    }
  }

  return alerts;
}
