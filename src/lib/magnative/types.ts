export type ClientStatus = "Prospek" | "Aktif" | "Selesai" | "Tidak Lanjut";

export type Client = {
  id: string;
  name: string;
  industry: string;
  picName: string;
  picPhone?: string;
  picEmail?: string;
  status: ClientStatus;
  catatan?: string;
};

export type ProjectType = "Event Organizer" | "Creative Agency" | "Media Sosial" | "Lainnya";
export type ProjectStatus = "Perencanaan" | "Berjalan" | "Selesai" | "Dibatalkan";

/**
 * Sama persis dengan `PaymentStatus` di `src/lib/magnarent/types.ts` dan
 * `src/lib/production/types.ts` — didefinisikan ulang di sini (bukan
 * di-import lintas modul) supaya tiap modul tetap berdiri sendiri, konsisten
 * dengan pola yang sudah ada (lihat migrasi 0011).
 */
export type PaymentStatus = "Belum Bayar" | "DP" | "Lunas";

export type Project = {
  id: string;
  clientId: string;
  name: string;
  type: ProjectType;
  tanggalMulai: string;
  tanggalSelesai: string;
  budget: number;
  status: ProjectStatus;
  /** Status tagihan ke klien — terpisah dari `status` (tahapan proyek). Lihat migrasi 0011. */
  statusPembayaran: PaymentStatus;
  catatan?: string;
};

export type Platform = "Instagram" | "TikTok" | "Facebook" | "YouTube" | "LinkedIn" | "Lainnya";
export type ContentStatus = "Draft" | "Review" | "Terjadwal" | "Tayang";

export type ContentPost = {
  id: string;
  clientId?: string;
  title: string;
  platform: Platform;
  tanggalPosting: string;
  status: ContentStatus;
  catatan?: string;
};
