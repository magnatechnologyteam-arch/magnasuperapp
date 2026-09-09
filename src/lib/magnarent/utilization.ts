import type { Booking, InventoryItem } from "./types";
import { todayISO } from "./date";

/**
 * Cuma booking yang BENAR-BENAR terjadi yang dihitung sebagai bukti
 * pemakaian — "Menunggu" belum tentu jadi (masih bisa dibatalkan/tidak
 * dikonfirmasi), "Dibatalkan" jelas tidak pernah benar-benar dipakai.
 */
const COUNTED_STATUSES: Booking["status"][] = ["Dikonfirmasi", "Selesai"];

/** Di bawah ini dianggap "idle lama" — dasar tanda kandidat dilepas. */
const IDLE_DAYS_THRESHOLD = 45;
/** Di dalam ini dianggap masih "hangat" dipakai, walau utilisasi periodenya kebetulan rendah. */
const RECENTLY_USED_DAYS_THRESHOLD = 14;
/** Ambang utilisasi (%) untuk dianggap "berputar baik". */
const GOOD_UTILIZATION_PCT = 30;
/** Di bawah ini (plus idle lama) dianggap kandidat dilepas. */
const LOW_UTILIZATION_PCT = 5;

export type UtilizationTier = "aktif" | "kurang" | "idle";

export type ItemUtilization = {
  item: InventoryItem;
  /** Total unit-hari tersewa dalam window yang dipilih (jumlahUnit x hari overlap dengan window). */
  rentedUnitDays: number;
  /** Total unit-hari yang tersedia dalam window (totalUnit x panjang window). */
  availableUnitDays: number;
  /** rentedUnitDays / availableUnitDays dalam persen, 0-100 (dibulatkan). */
  utilizationPct: number;
  /** Tanggal mulai booking (Dikonfirmasi/Selesai) TERAKHIR untuk alat ini — kapan pun, tidak dibatasi window. null kalau belum pernah dipakai sama sekali. */
  lastUsedDate: string | null;
  /** Selisih hari dari lastUsedDate ke hari ini — null kalau belum pernah dipakai. */
  daysSinceLastUsed: number | null;
  tier: UtilizationTier;
};

function daysBetween(startISO: string, endISO: string): number {
  const start = new Date(`${startISO}T00:00:00Z`);
  const end = new Date(`${endISO}T00:00:00Z`);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Panjang irisan (inklusif kedua ujung) antara dua rentang tanggal ISO, 0 kalau tidak beririsan sama sekali. */
function overlapDays(aStart: string, aEnd: string, bStart: string, bEnd: string): number {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  if (start > end) return 0;
  return daysBetween(start, end) + 1;
}

function classifyTier(utilizationPct: number, daysSinceLastUsed: number | null): UtilizationTier {
  const belumPernahAtauIdleLama = daysSinceLastUsed === null || daysSinceLastUsed > IDLE_DAYS_THRESHOLD;
  if (utilizationPct < LOW_UTILIZATION_PCT && belumPernahAtauIdleLama) return "idle";

  const barusanDipakai = daysSinceLastUsed !== null && daysSinceLastUsed <= RECENTLY_USED_DAYS_THRESHOLD;
  if (utilizationPct >= GOOD_UTILIZATION_PCT || barusanDipakai) return "aktif";

  return "kurang";
}

/**
 * Hitung metrik perputaran/utilisasi TIAP alat inventaris Magnarent dalam
 * `windowDays` hari terakhir — dasar untuk keputusan bisnis "alat mana yang
 * jarang jalan, kandidat dilepas buat bikin ruang gudang" (permintaan
 * investor: bukan cuma soal uang, tapi soal stok & perputaran barang —
 * lihat diskusi yang diteruskan owner soal modul Magnarent).
 *
 * `lastUsedDate`/`daysSinceLastUsed` sengaja dihitung dari SELURUH riwayat
 * booking (tidak dibatasi window) — supaya alat yang kebetulan terakhir
 * dipakai sedikit di luar window yang dipilih tidak keliru tampak "belum
 * pernah dipakai sama sekali".
 */
export function computeItemUtilization(
  inventory: InventoryItem[],
  bookings: Booking[],
  windowDays: number,
  today: string = todayISO()
): ItemUtilization[] {
  const windowStart = addDays(today, -(windowDays - 1));

  return inventory.map((item) => {
    const itemBookings = bookings.filter((b) => b.itemId === item.id && COUNTED_STATUSES.includes(b.status));

    const rentedUnitDays = itemBookings.reduce((sum, b) => {
      const overlap = overlapDays(b.tanggalMulai, b.tanggalSelesai, windowStart, today);
      return sum + overlap * b.jumlahUnit;
    }, 0);

    const availableUnitDays = item.totalUnit * windowDays;
    const utilizationPct =
      availableUnitDays > 0 ? Math.min(100, Math.round((rentedUnitDays / availableUnitDays) * 100)) : 0;

    const lastUsedDate = itemBookings.reduce<string | null>((latest, b) => {
      if (!latest || b.tanggalMulai > latest) return b.tanggalMulai;
      return latest;
    }, null);

    const daysSinceLastUsed = lastUsedDate ? daysBetween(lastUsedDate, today) : null;
    const tier = classifyTier(utilizationPct, daysSinceLastUsed);

    return { item, rentedUnitDays, availableUnitDays, utilizationPct, lastUsedDate, daysSinceLastUsed, tier };
  });
}
