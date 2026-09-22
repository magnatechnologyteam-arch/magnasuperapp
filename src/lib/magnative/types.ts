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
  /** Ditambahkan pasca-review (Tahap C modul "Realisasi Event") — sebelumnya
   * baris dari modal ini selalu dipaksa kategori "Lain-lain" & metode
   * "Tidak dicatat (via Biaya Proyek)" begitu disatukan ke `event_expenses`,
   * yang bikin rekap kategori/metode pembayaran jadi kurang rinci untuk
   * biaya proyek Magnative. Sekarang staf isi sendiri lewat modal ini —
   * nilainya sama persis dengan `ExpenseCategory`/metode bebas di modul
   * Realisasi Event (lihat src/lib/event-expenses/types.ts), cuma dipakai
   * sebagai `string` biasa di sini supaya types.ts modul Magnative tidak
   * perlu bergantung ke modul lain. */
  category: string;
  paymentMethod: string;
};

/**
 * Satu foto DI DALAM folder/album portofolio Magnativ (migrasi 0012,
 * direstrukturisasi migrasi 0057 dari flat photo jadi model folder/album —
 * lihat `PortfolioFolder` di bawah). `storagePath` disimpan terpisah dari
 * `photoUrl` supaya file di Supabase Storage bisa dihapus lewat path-nya
 * saat foto dihapus/gagal disimpan, tanpa perlu parsing URL publik.
 * `title`/`caption` PINDAH ke level folder (migrasi 0057) — satu folder
 * porto sekarang bisa memuat banyak foto (slide), jadi judul/keterangan
 * cukup satu per folder, bukan per foto.
 */
export type PortfolioPhoto = {
  id: string;
  photoUrl: string;
  storagePath: string;
  position: number;
};

/**
 * Folder/album portofolio Magnativ (migrasi 0057) — menggantikan model foto
 * flat lama supaya satu momen/event bisa didokumentasikan dengan BANYAK
 * foto sekaligus (ditampilkan sebagai slide lewat `PhotoCarousel`), bukan
 * cuma satu foto per kartu seperti sebelumnya. Update Opsional 1 butir 5:
 * portofolio sekarang tampil lintas divisi (widget Dashboard Hub + halaman
 * Ringkasan Magnativ) — RLS `_select` di tabel sumbernya terbuka untuk
 * semua akun login, meski hanya staf Magnativ yang bisa menulis/mengubah.
 */
export type PortfolioFolder = {
  id: string;
  title: string;
  caption?: string;
  photos: PortfolioPhoto[];
  createdAt: string;
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

/**
 * Komentar/feedback per aset kreatif — "proofing ringan" (Update Opsional
 * 2, hasil gap analysis vs aplikasi kreatif luar seperti Wrike/Productive
 * yang punya fitur komentar/anotasi langsung di atas file). `authorName`
 * DISNAPSHOT saat komentar dibuat (bukan join live ke profiles), pola sama
 * seperti `picName` di modul lain — supaya nama penulis tetap tampil apa
 * adanya meski akun staf berubah/dihapus nanti.
 */
export type AssetComment = {
  id: string;
  assetId: string;
  authorName: string;
  commentText: string;
  isResolved: boolean;
  createdAt: string;
};

/**
 * Basis data vendor/supplier eksternal (Update Opsional 2) — terpisah dari
 * `ProjectCost` supaya kontak vendor (venue, katering, dekorasi, dst) bisa
 * dipakai ulang lintas proyek tanpa diketik ulang tiap kali ada biaya baru.
 */
export type VendorCategory =
  | "Venue"
  | "Katering"
  | "Dekorasi"
  | "Sound System & Lighting"
  | "Fotografi/Videografi"
  | "Percetakan"
  | "Lainnya";

export type Vendor = {
  id: string;
  name: string;
  category: VendorCategory;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  catatan?: string;
};

/**
 * Kaitan satu vendor ke satu proyek — `biayaEstimasi` MURNI informatif
 * (mis. dari quote/penawaran vendor), BUKAN sumber jurnal akuntansi. Biaya
 * AKTUAL tetap dicatat lewat `ProjectCost` (event_expenses) seperti
 * sebelumnya, supaya tidak ada dua sumber kebenaran untuk laporan keuangan.
 */
export type ProjectVendor = {
  id: string;
  projectId: string;
  vendorId: string;
  keterangan?: string;
  biayaEstimasi: number;
};

/**
 * Task/sub-pekerjaan di dalam satu proyek Magnativ (Update Opsional 2) —
 * funnel status proyek (`ProjectStatus`) saja tidak cukup detail untuk
 * proyek tipe Event Organizer yang biasanya punya banyak sub-pekerjaan
 * paralel (venue, dekorasi, izin, dst). `pic` merujuk ke `auth.users.id`,
 * sama pola dengan `pic` di `event_checklist_items` — daftar staf yang
 * bisa ditunjuk dipakai ulang dari `getAssignablePics` (src/lib/events/data.ts).
 */
export type ProjectTaskStatus = "Belum Mulai" | "Berjalan" | "Selesai";

export type ProjectTask = {
  id: string;
  projectId: string;
  title: string;
  detail?: string;
  status: ProjectTaskStatus;
  dueDate?: string;
  pic?: string;
  picName?: string;
  sortOrder: number;
};
