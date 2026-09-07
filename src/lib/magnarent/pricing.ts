import type { Booking, InventoryItem } from "./types";

/** Jumlah hari sewa, inklusif tanggal mulai dan selesai (mis. 10-12 Sep = 3 hari). */
export function countDaysInclusive(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  const diffDays = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  return Math.max(diffDays + 1, 1);
}

/**
 * Estimasi total biaya booking = harga/hari alat saat ini × jumlah unit × jumlah hari.
 * MVP: dihitung dari harga alat SAAT INI, belum snapshot harga di waktu booking dibuat
 * (perlu jika harga sewa berubah-ubah dan histori invoice harus tetap akurat).
 */
export function calculateBookingTotal(
  booking: Pick<Booking, "tanggalMulai" | "tanggalSelesai" | "jumlahUnit">,
  item: InventoryItem | undefined
): number {
  if (!item) return 0;
  const days = countDaysInclusive(booking.tanggalMulai, booking.tanggalSelesai);
  return item.pricePerDay * booking.jumlahUnit * days;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
