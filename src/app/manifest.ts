import type { MetadataRoute } from "next";

/**
 * Web App Manifest — file convention Next.js App Router. Dengan file ini
 * ada, Next.js otomatis men-serve-nya di `/manifest.webmanifest` DAN
 * menyisipkan tag `<link rel="manifest">` yang sesuai ke `<head>`, jadi
 * tidak perlu ubah apa pun secara manual di `layout.tsx` untuk itu.
 *
 * Ini yang membuat MagnaSuperApp bisa di-"Add to Home Screen"/"Install"
 * dari browser (Chrome Android, Safari iOS, Edge/Chrome desktop) dan
 * tampil seperti aplikasi asli (tanpa address bar) begitu dibuka dari
 * ikon di layar utama — bukan cuma tab browser biasa.
 *
 * Service Worker (`/sw.js`) sendiri didaftarkan otomatis di SEMUA halaman
 * (termasuk /login, sebelum orang sempat login) lewat `PwaInstallPrompt`
 * yang dipasang di root layout (src/app/layout.tsx) — Tahap 36: sebelumnya
 * cuma terdaftar lewat `PushNotificationBell` di dalam dashboard (setelah
 * login), sehingga orang yang belum login tidak pernah memenuhi syarat
 * instalabilitas sama sekali. `PushNotificationBell` (lihat
 * src/components/push/usePushSubscription.ts) tetap ikut memanggil
 * `.register()` juga saat dashboard dibuka — aman, dipanggil berkali-kali
 * dengan script/scope sama cuma mengembalikan registrasi yang sudah ada.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MagnaSuperApp",
    short_name: "MagnaSuperApp",
    description: "Dashboard terpadu untuk Magnativ, Magnarent, dan Production — Magna Technology.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    // Tahap 31: theme_color disamakan persis dengan emas logo resmi Production
    // (lihat navigation.ts BRAND_GRADIENT) — sebelumnya perkiraan warna dari
    // render 3D ikon (Tahap 30).
    background_color: "#0A1528",
    theme_color: "#D4AF37",
    lang: "id",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
