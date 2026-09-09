export type InventoryStatus = "Tersedia" | "Terbatas" | "Habis" | "Maintenance";

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  /** Gudang/lokasi fisik penyimpanan — mis. "Gudang Cikarang", "Gudang Pusat". */
  location: string;
  /** Harga sewa per unit per hari, dalam Rupiah. */
  pricePerDay: number;
  /** Total unit fisik yang dimiliki, termasuk yang sedang maintenance. */
  totalUnit: number;
  /** Unit yang sedang rusak/servis — otomatis mengurangi unit yang bisa disewa. */
  unitMaintenance: number;
};

export type BookingStatus = "Menunggu" | "Dikonfirmasi" | "Selesai" | "Dibatalkan";

export type PaymentStatus = "Belum Bayar" | "DP" | "Lunas";

export type Booking = {
  id: string;
  itemId: string;
  /** Tautan opsional ke klien terdaftar di Magnative (`magnative_clients`) — lihat migrasi 0010. */
  clientId?: string;
  namaKlien: string;
  teleponKlien?: string;
  /** Format ISO yyyy-mm-dd, inklusif di kedua ujung. */
  tanggalMulai: string;
  tanggalSelesai: string;
  jumlahUnit: number;
  status: BookingStatus;
  statusPembayaran: PaymentStatus;
  /** Nominal DP yang SUDAH diterima (Rupiah) — cuma relevan kalau statusPembayaran "DP", 0 selain itu. Migrasi 0015. */
  dpAmount: number;
  catatan?: string;
};
