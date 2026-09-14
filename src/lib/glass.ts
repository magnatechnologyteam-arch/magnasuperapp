/**
 * "Liquid Glass" (Tahap 38) — permintaan Owner: gaya kaca buram/blur ala
 * iOS untuk UI aplikasi. Kelas siap-pakai di sini dipakai lintas Sidebar/
 * Topbar/MobileNav/SubNav/kartu dashboard/Chat supaya satu bahasa visual
 * konsisten, bukan tiap file menuliskan sendiri kombinasi
 * bg-opacity/backdrop-blur/shadow-nya (gampang beda sendiri kalau nanti
 * mau disetel ulang, dan mudah lupa salah satu file).
 *
 * SENGAJA murni kelas utility Tailwind (bg-white/N tembus pandang +
 * backdrop-blur + backdrop-saturate untuk efek "vibrancy", ditambah
 * shadow arbitrary BERTUMPUK: satu shadow biasa untuk elevasi + satu
 * `inset` tipis di tepi atas untuk kesan garis highlight kaca) — TANPA
 * lapisan CSS custom terpisah, konsisten dengan gaya kode di seluruh app
 * ini yang menghindari abstraksi tambahan kalau utility Tailwind saja
 * sudah cukup.
 *
 * Border SENGAJA dipisah dari surface (GLASS_BORDER berdiri sendiri) —
 * tiap pemanggil pilih sendiri sisi border yang relevan (`border-b` untuk
 * Topbar, `border-r` untuk Sidebar, `border` penuh untuk kartu), bukan
 * dipaksa satu bentuk border yang sama di semua tempat.
 *
 * Cakupan (Tahap 38): chrome global (Sidebar/Topbar/MobileNav/SubNav),
 * kartu KPI (StatCard/QuickStatCard) & Dashboard Hub, dan halaman Chat.
 * SENGAJA TIDAK disentuh: badge logo modul di ModuleHeader.tsx (panel
 * putih di baliknya sengaja opak sejak Tahap 31 supaya logo Magnativ/
 * Production yang senada warna dengan gradient di belakangnya tetap
 * kebaca — bikin itu transparan akan memunculkan lagi masalah kontras
 * yang sudah pernah diperbaiki), dan MaintenanceBanner.tsx (banner
 * peringatan sistem sengaja solid & mencolok, bukan kaca pasif). Tabel/
 * form/galeri di dalam tiap modul (Magnarent/Magnative/Production/Admin/
 * Investor) belum ikut tahap ini — bisa menyusul pakai kelas yang sama di
 * sini kalau Owner mau lanjutkan cakupannya.
 */

/** Panel kaca standar — kartu, dropdown ringan, tab bar. */
export const GLASS_SURFACE =
  "bg-white/55 shadow-[0_8px_32px_-8px_rgba(31,41,55,0.18),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-2xl backdrop-saturate-150 dark:bg-zinc-900/45 dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]";

/** Versi lebih pekat — dipakai Topbar/Sidebar/drawer/dropdown menu: teks & ikon
 * harus tetap kebaca jelas walau ada konten warna-warni ter-scroll di baliknya. */
export const GLASS_SURFACE_STRONG =
  "bg-white/75 shadow-[0_8px_32px_-8px_rgba(31,41,55,0.18),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-2xl backdrop-saturate-150 dark:bg-zinc-900/70 dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]";

/** Warna border tembus-pandang yang senada dua treatment di atas. */
export const GLASS_BORDER = "border-white/50 dark:border-white/10";

/** Pil/tombol/tab kecil bergaya kaca (mis. tab tidak-aktif, tombol ikon). */
export const GLASS_PILL =
  "border-white/50 bg-white/50 backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-white/10";

/** Kotak input kaca — dipakai kotak ketik chat. */
export const GLASS_INPUT = "border-white/50 bg-white/40 backdrop-blur-xl dark:border-white/10 dark:bg-white/5";
