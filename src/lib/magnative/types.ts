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
/**
 * "Pitching" ditambahkan migrasi 0016 — tahap SEBELUM "Perencanaan", untuk
 * proyek yang masih diajukan/ditawarkan ke calon klien dan belum pasti
 * deal. Kalau pitching gagal, proyek cukup dipindah ke "Dibatalkan" —
 * biayanya (lihat `ProjectCost` di bawah) tetap tercatat sebagai
 * pengeluaran nyata meski proyeknya sendiri tidak pernah jalan.
 */
export type ProjectStatus = "Pitching" | "Perencanaan" | "Berjalan" | "Selesai" | "Dibatalkan";

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
  /** Nominal DP yang SUDAH diterima (Rupiah) — cuma relevan kalau statusPembayaran "DP", 0 selain itu. Migrasi 0015. */
  dpAmount: number;
  catatan?: string;
};

/**
 * Satu baris biaya/pengeluaran untuk sebuah proyek Magnativ (migrasi 0017)
 * — jawaban untuk permintaan investor (diteruskan owner) soal "rekapan
 * cost dan kapannya (keluar atau masuk dana)". Dana MASUK sudah tercatat
 * lewat tabel `invoices` yang terhubung ke proyek (sourceType
 * "magnative_project"); tabel/tipe ini melengkapi sisi dana KELUAR
 * (biaya pitching, produksi, vendor, dll) supaya laporan arus kas per
 * proyek bisa menggabungkan keduanya. Sengaja dicatat per baris (bukan
 * satu angka total) supaya rekapannya rinci per pengeluaran dan tanggal.
 */
export type ProjectCost = {
  id: string;
  projectId: string;
  description: string;
  amount: number;
  costDate: string;
};

/**
 * Satu foto di galeri portofolio Magnativ (migrasi 0012) — menggantikan
 * PlaceholderGallery statis. `storagePath` disimpan terpisah dari
 * `photoUrl` supaya file di Supabase Storage bisa dihapus lewat path-nya
 * saat foto dihapus/gagal disimpan, tanpa perlu parsing URL publik.
 */
export type PortfolioPhoto = {
  id: string;
  photoUrl: string;
  storagePath: string;
  title: string;
  caption?: string;
};

export type Platform = "Instagram" | "TikTok" | "Facebook" | "YouTube" | "LinkedIn" | "Lainnya";
/**
 * Alur approval konten (Tahap 28b, migrasi 0026) — Draft (sedang dibuat) →
 * Revisi (dikembalikan dengan catatan apa yang perlu diperbaiki, lihat
 * `feedbackRevisi`) → Disetujui (lolos review, tinggal tunggu tanggal
 * tayang) → Tayang (sudah posting). Menggantikan status lama
 * Draft/Review/Terjadwal/Tayang — lihat komentar migrasi 0026 untuk
 * pemetaan data lama ke status baru.
 */
export type ContentStatus = "Draft" | "Revisi" | "Disetujui" | "Tayang";

export type ContentPost = {
  id: string;
  clientId?: string;
  title: string;
  platform: Platform;
  tanggalPosting: string;
  status: ContentStatus;
  catatan?: string;
  /** Catatan reviewer saat status "Revisi" — kosong lagi begitu status berubah lagi. Migrasi 0026. */
  feedbackRevisi?: string;
};

/**
 * Permintaan konten dari klien (Tahap 28b, migrasi 0026) — antrean masuk
 * SEBELUM jadi entri terjadwal di `ContentPost`. Staf mencatat permintaan
 * mentah di sini (lewat telepon/WA/email dari klien), lalu setelah
 * diproses membuatkan `ContentPost` sungguhan secara terpisah — dua tabel
 * ini sengaja tidak ditautkan otomatis supaya staf tetap bisa menyesuaikan
 * judul/platform/tanggal saat menjadwalkan.
 */
export type ContentRequestPriority = "Rendah" | "Sedang" | "Tinggi";
export type ContentRequestStatus = "Baru" | "Diproses" | "Selesai" | "Ditolak";

export type ContentRequest = {
  id: string;
  clientId: string;
  title: string;
  description: string;
  deadline?: string;
  priority: ContentRequestPriority;
  status: ContentRequestStatus;
  catatan?: string;
};

/**
 * Galeri aset kreatif (Tahap 28b, migrasi 0026) — perpustakaan kerja
 * internal tim (template, foto mentah, video, file desain). BEDA dari
 * `PortfolioPhoto` di atas: portofolio adalah showcase hasil JADI untuk
 * klien/investor, aset kreatif adalah bahan MENTAH/kerja tim sendiri.
 */
export type CreativeAssetCategory = "Template" | "Foto Mentah" | "Video" | "Desain Grafis" | "Lainnya";
export type CreativeAssetFileType = "image" | "video" | "other";

export type CreativeAsset = {
  id: string;
  title: string;
  category: CreativeAssetCategory;
  fileUrl: string;
  storagePath: string;
  fileType: CreativeAssetFileType;
  caption?: string;
};
