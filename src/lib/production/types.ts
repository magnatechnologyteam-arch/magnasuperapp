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

export type BoothProject = {
  id: string;
  name: string;
  namaKlien: string;
  lokasiAcara: string;
  status: BoothStatus;
  /** Tanggal mulai pengerjaan (desain/produksi). */
  tanggalMulai: string;
  /** Deadline instalasi booth di lokasi acara. */
  tanggalInstalasi: string;
  budget: number;
  materials: MaterialUsage[];
  catatan?: string;
};
