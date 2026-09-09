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
  /** Perkiraan billing/pendapatan dari event ini ("A1" di rancangan awal Owner —
   * sengaja TIDAK ditampilkan ke pengguna sebagai "A1", istilah rumus itu cuma
   * dipakai Owner waktu diskusi awal, bukan istilah yang enak dibaca di UI). */
  billingEstimate: number;
  /** Perkiraan modal/biaya yang dibutuhkan untuk event ini ("A2" di rancangan awal). */
  modalEstimate: number;
  status: CapitalRequestStatus;
  investorNote?: string;
  submittedBy?: string;
  decidedBy?: string;
  decidedAt?: string;
  createdAt: string;
};
