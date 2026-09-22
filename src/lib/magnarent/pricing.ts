import type { Booking, InventoryItem } from "./types";

/** Jumlah hari sewa, inklusif tanggal mulai dan selesai (mis. 10-12 Sep = 3 hari). */
export function countDaysInclusive(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  const diffDays = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  return Math.max(diffDays + 1, 1);
}

/**
 * Estimasi biaya sewa SATU unit untuk sejumlah hari — pakai harga
 * bertingkat kalau diisi di alat (Gap #1 analisis Magnarent): ambil
 * sebanyak mungkin blok 30-hari dengan `pricePerMonth` dulu, sisanya
 * blok 7-hari dengan `pricePerWeek`, sisanya lagi dihitung harian.
 * Kalau `pricePerWeek`/`pricePerMonth` tidak diisi (undefined), perilakunya
 * identik dengan sebelumnya: murni harga/hari × jumlah hari.
 */
export function calculateUnitPrice(item: Pick<InventoryItem, "pricePerDay" | "pricePerWeek" | "pricePerMonth">, days: number): number {
  let remaining = days;
  let total = 0;

  if (item.pricePerMonth !== undefined && remaining >= 30) {
    const months = Math.floor(remaining / 30);
    total += months * item.pricePerMonth;
    remaining -= months * 30;
  }
  if (item.pricePerWeek !== undefined && remaining >= 7) {
    const weeks = Math.floor(remaining / 7);
    total += weeks * item.pricePerWeek;
    remaining -= weeks * 7;
  }
  total += remaining * item.pricePerDay;

  return total;
}

/**
 * Estimasi total biaya booking = harga sewa per unit (harian/mingguan/bulanan,
 * lihat `calculateUnitPrice`) × jumlah unit.
 * MVP: dihitung dari harga alat SAAT INI, belum snapshot harga di waktu booking dibuat
 * (perlu jika harga sewa berubah-ubah dan histori invoice harus tetap akurat).
 */
export function calculateBookingTotal(
  booking: Pick<Booking, "tanggalMulai" | "tanggalSelesai" | "jumlahUnit">,
  item: InventoryItem | undefined
): number {
  if (!item) return 0;
  const days = countDaysInclusive(booking.tanggalMulai, booking.tanggalSelesai);
  return calculateUnitPrice(item, days) * booking.jumlahUnit;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
