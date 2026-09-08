import { redirect } from "next/navigation";

/**
 * Pendaftaran mandiri sudah dimatikan — akun staf sekarang HANYA dibuat
 * oleh admin (division "all") lewat halaman /dashboard/admin/pengguna.
 * Rute ini dipertahankan sebagai stub redirect (bukan dihapus) supaya
 * tautan lama yang mungkin sudah tersimpan (bookmark, dsb.) tidak 404.
 */
export default function RegisterPage() {
  redirect("/login");
}
