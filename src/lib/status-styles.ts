/**
 * Peta warna badge status/pembayaran/platform — SATU-SATUNYA sumber untuk
 * semua badge sejenis di seluruh aplikasi. Sebelumnya tiap komponen (Manager
 * di sisi Owner, tabel read-only di sisi Investor, dsb.) menulis ulang peta
 * warna yang identik sendiri-sendiri — total 16 file, beberapa di antaranya
 * byte-demi-byte sama persis. Risikonya: ganti satu warna di satu tempat,
 * lupa di 3 tempat lain yang menampilkan status yang sama, jadi kelihatan
 * tidak konsisten (mis. "Lunas" hijau di satu halaman, beda gelap di halaman
 * lain) tanpa ada yang sadar sampai ada yang lapor.
 *
 * Tipe di sini sengaja berupa union string literal langsung (bukan meng-impor
 * `PaymentStatus`/`BoothStatus`/dst. dari modul-modul `@/lib/.../types`) — TypeScript
 * structural typing membuat `Record<"Belum Bayar" | "DP" | "Lunas", string>`
 * di sini otomatis cocok dipakai di manapun `PaymentStatus` (yang nilainya
 * union string yang sama) dipakai, walau union itu didefinisikan terpisah di
 * `magnarent/types.ts`, `magnative/types.ts`, dan `production/types.ts`.
 * File ini jadi leaf module murni — tidak perlu tahu atau bergantung pada
 * modul-modul domain manapun.
 *
 * Setiap konstanta di bawah HANYA memindah objek data biasa (string ke
 * string) — bukan fungsi — jadi aman dipakai lintas Server/Client Component
 * tanpa risiko error serialisasi seperti yang pernah terjadi di
 * `QuickStatCard` (lihat riwayat perbaikan `formatAsRupiah`).
 */

/** Booking Magnarent — dipakai BookingScheduler (Owner) & InvestorBookingTable. */
export const BOOKING_STATUS_STYLES: Record<
  "Menunggu" | "Dikonfirmasi" | "Selesai" | "Dibatalkan",
  string
> = {
  Menunggu: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Dikonfirmasi: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Selesai: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
  Dibatalkan: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

/**
 * Status pembayaran — dipakai di 6 tempat lintas 3 modul (Magnarent,
 * Magnativ, Production) baik sisi Owner maupun Investor. Union stringnya
 * sama persis di ketiga modul walau didefinisikan sebagai tipe terpisah.
 */
export const PAYMENT_STYLES: Record<"Belum Bayar" | "DP" | "Lunas", string> = {
  "Belum Bayar": "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  DP: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Lunas: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
};

/** Proyek Magnativ — dipakai ProjectManager (Owner), InvestorProjectTable, & ArusKasProyekView. */
export const PROJECT_STATUS_STYLES: Record<
  "Pitching" | "Perencanaan" | "Berjalan" | "Selesai" | "Dibatalkan",
  string
> = {
  Pitching: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  Perencanaan: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Berjalan: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Selesai: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Dibatalkan: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

/**
 * Konten Magnativ — dipakai ContentPlanner (Owner) & InvestorContentTable.
 * Status "Revisi"/"Disetujui" (Tahap 28b, migrasi 0026) menggantikan
 * "Review"/"Terjadwal" lama — warnanya sengaja dipertahankan sama supaya
 * badge tidak mendadak berubah warna di data lama yang sudah dimigrasi.
 */
export const CONTENT_STATUS_STYLES: Record<"Draft" | "Revisi" | "Disetujui" | "Tayang", string> = {
  Draft: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
  Revisi: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Disetujui: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Tayang: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
};

/** Prioritas permintaan konten (Tahap 28b) — cuma dipakai ContentRequestManager. */
export const CONTENT_REQUEST_PRIORITY_STYLES: Record<"Rendah" | "Sedang" | "Tinggi", string> = {
  Rendah: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
  Sedang: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Tinggi: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

/** Status permintaan konten (Tahap 28b) — cuma dipakai ContentRequestManager. */
export const CONTENT_REQUEST_STATUS_STYLES: Record<"Baru" | "Diproses" | "Selesai" | "Ditolak", string> = {
  Baru: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Diproses: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Selesai: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Ditolak: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

/** Platform media sosial — dipakai ContentPlanner (Owner) & InvestorContentTable. */
export const PLATFORM_STYLES: Record<
  "Instagram" | "TikTok" | "Facebook" | "YouTube" | "LinkedIn" | "Lainnya",
  string
> = {
  Instagram: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
  TikTok: "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-200",
  Facebook: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  YouTube: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  LinkedIn: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Lainnya: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
};

/** Inventaris Magnarent — cuma dipakai InventoryManager, disatukan di sini untuk konsistensi pola. */
export const INVENTORY_STATUS_STYLES: Record<
  "Tersedia" | "Terbatas" | "Habis" | "Maintenance",
  string
> = {
  Tersedia: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Terbatas: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Habis: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  Maintenance: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
};

/** Invoice lintas divisi — dipakai InvoiceManager (Owner) & InvestorInvoiceTable. */
export const INVOICE_STATUS_STYLES: Record<"Draft" | "Terkirim" | "Lunas", string> = {
  Draft: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
  Terkirim: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Lunas: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
};

/** Proyek booth Production — dipakai BoothProjectManager (Owner), InvestorBoothTable, & MaterialReuseReport. */
export const BOOTH_STATUS_STYLES: Record<
  "Desain" | "Produksi" | "Finishing" | "Instalasi" | "Selesai" | "Dibatalkan",
  string
> = {
  Desain: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Produksi: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Finishing: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  Instalasi: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300",
  Selesai: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Dibatalkan: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

/** Purchase order Production — cuma dipakai PurchaseOrderManager, disatukan di sini untuk konsistensi pola. */
export const PURCHASE_ORDER_STATUS_STYLES: Record<"Dipesan" | "Diterima" | "Dibatalkan", string> = {
  Dipesan: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Diterima: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Dibatalkan: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

/** Pengajuan Modal — dipakai CapitalRequestManager (Owner) & CapitalRequestInbox (Investor). */
export const CAPITAL_REQUEST_STATUS_STYLES: Record<"Menunggu" | "Disetujui" | "Ditolak", string> = {
  Menunggu: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Disetujui: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Ditolak: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

/** Kondisi alat berat/perkakas Production (Tahap 28c) — cuma dipakai EquipmentManager. */
export const EQUIPMENT_CONDITION_STYLES: Record<"Baik" | "Perlu Servis" | "Rusak", string> = {
  Baik: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  "Perlu Servis": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Rusak: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

/** Klien Magnativ — cuma dipakai ClientManager, disatukan di sini untuk konsistensi pola. */
export const CLIENT_STATUS_STYLES: Record<
  "Prospek" | "Aktif" | "Selesai" | "Tidak Lanjut",
  string
> = {
  Prospek: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Aktif: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Selesai: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
  "Tidak Lanjut": "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};
