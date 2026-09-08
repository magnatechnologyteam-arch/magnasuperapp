export type MaterialCategory =
  | "Kayu & Panel"
  | "Cat & Finishing"
  | "Hardware & Rangka"
  | "Elektrikal"
  | "Lainnya";

export type MaterialUnit = "pcs" | "lembar" | "batang" | "meter" | "kg" | "liter" | "set";

export type MaterialItem = {
  id: string;
  name: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  /** Gudang/lokasi fisik penyimpanan. */
  location: string;
  /** Stok fisik yang ada di gudang saat ini. */
  stock: number;
  /** Ambang batas — di bawah/sama dengan ini dianggap "stok menipis". */
  minStock: number;
  /** Harga per satuan, dalam Rupiah — dipakai untuk estimasi biaya material proyek. */
  pricePerUnit: number;
};

/**
 * Satu baris pemakaian material di sebuah proyek booth — bukan pengurangan
 * stok permanen, melainkan "alokasi" yang dihitung ulang tiap render
 * (lihat src/lib/production/availability.ts), sama seperti pola booking
 * di Magnarent: stok baru benar-benar berkurang kalau proyeknya aktif.
 */
export type MaterialUsage = {
  materialId: string;
  qty: number;
};

/** Tahapan produksi booth, dari desain sampai instalasi di lokasi acara. */
export type BoothStatus =
  | "Desain"
  | "Produksi"
  | "Finishing"
  | "Instalasi"
  | "Selesai"
  | "Dibatalkan";

/**
 * Sama persis dengan `PaymentStatus` di `src/lib/magnarent/types.ts` dan
 * `src/lib/magnative/types.ts` — didefinisikan ulang di sini (bukan
 * di-import lintas modul) supaya tiap modul tetap berdiri sendiri, konsisten
 * dengan pola yang sudah ada (lihat migrasi 0011).
 */
export type PaymentStatus = "Belum Bayar" | "DP" | "Lunas";

export type BoothProject = {
  id: string;
  name: string;
  /** Tautan opsional ke klien terdaftar di Magnative (`magnative_clients`) — lihat migrasi 0010. */
  clientId?: string;
  namaKlien: string;
  lokasiAcara: string;
  status: BoothStatus;
  /** Tanggal mulai pengerjaan (desain/produksi). */
  tanggalMulai: string;
  /** Deadline instalasi booth di lokasi acara. */
  tanggalInstalasi: string;
  budget: number;
  /** Status tagihan ke klien — terpisah dari `status` (tahapan produksi). Lihat migrasi 0011. */
  statusPembayaran: PaymentStatus;
  materials: MaterialUsage[];
  catatan?: string;
};
