export type InvoiceDivision = "magnarent" | "magnative" | "production";

export type InvoiceSourceType = "magnarent_booking" | "magnative_project" | "production_booth";

export type InvoiceStatus = "Draft" | "Terkirim" | "Lunas";

export type InvoiceItem = {
  description: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
  // Tiga field opsional di bawah MURNI presentasi (tidak ikut hitungan
  // subtotal/total — itu tetap qty * unitPrice, dihitung ulang di server).
  // Dipakai supaya baris item bisa tampil persis seperti template invoice
  // referensi Magnarent, mis. qtyLabel "2 unit × 3 hari" (padahal qty
  // aslinya 6 = 2 unit x 3 hari, supaya matematika qty*unitPrice tetap
  // benar), unitLabel "hari" (tampil "Rp 25.000/hari"), note untuk baris
  // keterangan kecil di bawah deskripsi (mis. "2 unit × Rp 25.000/hari × 3
  // hari").
  qtyLabel?: string;
  unitLabel?: string;
  note?: string;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  division: InvoiceDivision;
  sourceType?: InvoiceSourceType;
  sourceId?: string;
  // Label dokumen opsional di bawah judul "INVOICE" (mis. "Proforma Invoice
  // (PI)") — staf isi manual per invoice, tidak ada nilai baku di kode.
  documentLabel?: string;
  // PIC/penandatangan invoice dari sisi perusahaan (blok "DARI") — beda
  // dari clientPhone (nomor WA KLIEN, dipakai kirim invoice). Opsional,
  // staf isi manual per invoice (lihat catatan privasi di migrasi 0058).
  picName?: string;
  picPhone?: string;
  clientName: string;
  clientPhone?: string;
  // Detail acara/pengiriman (opsional, free text) — dipetakan dari
  // template referensi: Event, Lokasi, Tgl Acara, Loading, Durasi,
  // Pengiriman.
  eventName?: string;
  eventLocation?: string;
  eventDateLabel?: string;
  loadingInfo?: string;
  durationLabel?: string;
  deliveryMethod?: string;
  items: InvoiceItem[];
  subtotal: number;
  // Ongkos kirim — PENDAPATAN riil (klien benar-benar membayar ini),
  // makanya ikut masuk ke `total`. Beda dengan `depositAmount` di bawah.
  shippingCost: number;
  // total = subtotal (item) + shippingCost. Ini yang dipakai jurnal
  // akuntansi (postInvoiceLunasJournal) sebagai pendapatan saat "Lunas" —
  // SENGAJA TIDAK termasuk depositAmount (lihat komentar di bawah).
  total: number;
  // Deposit/jaminan yang DAPAT DIKEMBALIKAN — bukan pendapatan, jadi
  // SENGAJA dipisah dari `total` dan tidak pernah ikut jurnal akuntansi.
  // Cuma tampil informatif di PDF ("Total Dibayarkan" = total +
  // depositAmount, dihitung saat render, tidak disimpan sebagai kolom
  // terpisah).
  depositAmount: number;
  depositLabel?: string;
  bankName?: string;
  bankAccountHolder?: string;
  bankAccountNumber?: string;
  // Kotak peringatan ⚠ di dekat metode pembayaran (opsional, free text).
  paymentNote?: string;
  // Syarat & Ketentuan — satu baris per syarat (dipisah newline di form),
  // dirender bernomor otomatis di PDF, mirip pola `catatan`.
  termsConditions?: string;
  status: InvoiceStatus;
  issuedDate: string;
  dueDate?: string;
  pdfUrl?: string;
  pdfStoragePath?: string;
  catatan?: string;
  createdAt: string;
};

/**
 * Satu opsi "sumber" di picker pembuatan invoice — hasil normalisasi booking
 * Magnarent + proyek Magnativ + proyek Production jadi satu bentuk yang
 * sama, mirip `Entry` di src/app/dashboard/admin/keuangan/page.tsx. Dipakai
 * untuk mengisi form invoice otomatis (klien, telepon, deskripsi, harga)
 * saat staf memilih salah satu booking/proyek yang sudah ada.
 */
export type InvoiceSourceOption = {
  sourceType: InvoiceSourceType;
  sourceId: string;
  division: InvoiceDivision;
  label: string;
  clientName: string;
  clientPhone?: string;
  amount: number;
  date: string;
};
