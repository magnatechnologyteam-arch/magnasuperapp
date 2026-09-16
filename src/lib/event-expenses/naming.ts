const MONTH_LABELS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Bersihkan teks supaya aman dipakai sebagai bagian nama file — buang
 * karakter selain huruf/angka/spasi/strip, lalu hilangkan semua spasi
 * (bukan diganti underscore, supaya nama file tidak kepanjangan). */
function sanitizeForFileName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "");
}

/**
 * Nama file bukti transaksi sesuai template yang disepakati bersama Owner:
 * Nama_TanggalBulan_Nominal_KeteranganPengeluaran — dipakai untuk nama
 * TAMPILAN (kolom `file_name` di `event_expense_proofs`), BUKAN nama file
 * sebenarnya di Storage (yang tetap path acak, lihat migrasi 0049).
 *
 * Dipanggil dari Server Action (`addExpenseProof`) supaya konsisten — bukan
 * dari input user langsung, supaya format selalu seragam apa pun yang
 * diketik user di field Keterangan.
 */
export function buildProofFileName(params: {
  picName: string;
  /** Format YYYY-MM-DD */
  expenseDate: string;
  amount: number;
  /** Keterangan singkat — kalau kosong, dipakai fallback "BuktiTransaksi". */
  note: string;
  /** Urutan file ke-berapa dari beberapa bukti untuk satu pengeluaran (mulai 1). */
  index: number;
  extension: string;
}): string {
  const [, monthStr, dayStr] = params.expenseDate.split("-");
  const monthLabel = MONTH_LABELS_ID[Number(monthStr) - 1] ?? monthStr;
  const tanggalBulan = `${dayStr}${monthLabel}`;

  const namaBagian = sanitizeForFileName(params.picName) || "Pengeluaran";
  const keteranganBagian = sanitizeForFileName(params.note) || "BuktiTransaksi";
  const suffix = params.index > 1 ? `_${params.index}` : "";
  const ext = sanitizeForFileName(params.extension).toLowerCase() || "jpg";

  return `${namaBagian}_${tanggalBulan}_${Math.round(params.amount)}_${keteranganBagian}${suffix}.${ext}`;
}
