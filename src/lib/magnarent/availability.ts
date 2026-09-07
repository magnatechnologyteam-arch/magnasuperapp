import type { Booking, InventoryItem, InventoryStatus } from "./types";
import { todayISO } from "./date";

/** Status yang masih "memakan" stok — booking selesai/dibatalkan tidak lagi menahan unit. */
export const ACTIVE_BOOKING_STATUSES: Booking["status"][] = ["Menunggu", "Dikonfirmasi"];

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Cari booking aktif untuk satu alat yang rentang tanggalnya bersinggungan
 * dengan rentang yang diminta — inilah inti pengecekan anti-bentrok jadwal.
 */
export function getOverlappingBookings(
  bookings: Booking[],
  itemId: string,
  start: string,
  end: string,
  excludeBookingId?: string
): Booking[] {
  return bookings.filter(
    (b) =>
      b.itemId === itemId &&
      b.id !== excludeBookingId &&
      ACTIVE_BOOKING_STATUSES.includes(b.status) &&
      rangesOverlap(b.tanggalMulai, b.tanggalSelesai, start, end)
  );
}

export function getBookedUnitsInRange(
  bookings: Booking[],
  itemId: string,
  start: string,
  end: string,
  excludeBookingId?: string
): number {
  return getOverlappingBookings(bookings, itemId, start, end, excludeBookingId).reduce(
    (sum, b) => sum + b.jumlahUnit,
    0
  );
}

/** Unit yang masih bisa dipesan pada rentang tanggal tertentu (bisa negatif jika sudah overbooked). */
export function getAvailableUnitsInRange(
  item: InventoryItem,
  bookings: Booking[],
  start: string,
  end: string,
  excludeBookingId?: string
): number {
  const bookable = item.totalUnit - item.unitMaintenance;
  const booked = getBookedUnitsInRange(bookings, item.id, start, end, excludeBookingId);
  return bookable - booked;
}

export function getInventoryStatus(item: InventoryItem, bookings: Booking[]): InventoryStatus {
  const bookable = item.totalUnit - item.unitMaintenance;
  if (bookable <= 0) return "Maintenance";

  const today = todayISO();
  const availableToday = getAvailableUnitsInRange(item, bookings, today, today);

  if (availableToday <= 0) return "Habis";
  if (availableToday < bookable) return "Terbatas";
  return "Tersedia";
}
