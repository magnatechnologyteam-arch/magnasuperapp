/**
 * "Pengajuan Modal" — permintaan dana yang diajukan Owner untuk sebuah event
 * Magnativ SEBELUM proyeknya digarap, lalu diputuskan (Approve/Reject) oleh
 * akun investor. Lihat migrasi 0019 untuk RLS & alur lengkapnya.
 */
export type CapitalRequestStatus = "Menunggu" | "Disetujui" | "Ditolak";

export type CapitalRequest = {
  id: string;
  eventName: string;
  location: string;
  /** Nullable — event sering dadakan, tanggal pasti belum tentu ada saat diajukan. */
  eventDate?: string;
  /** "A1" di rancangan Owner — perkiraan billing/pendapatan dari event ini. */
  billingEstimate: number;
  /** "A2" di rancangan Owner — perkiraan modal/biaya yang dibutuhkan. */
  modalEstimate: number;
  status: CapitalRequestStatus;
  investorNote?: string;
  submittedBy?: string;
  decidedBy?: string;
  decidedAt?: string;
  createdAt: string;
};

/** margin% = (A1 - A2) / A1, persis rumus di papan tulis Owner. */
export function calculateMargin(billingEstimate: number, modalEstimate: number): number {
  if (billingEstimate <= 0) return 0;
  return ((billingEstimate - modalEstimate) / billingEstimate) * 100;
}
