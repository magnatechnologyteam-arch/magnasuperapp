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
 * Service Worker (`/sw.js`) sendiri SUDAH terdaftar otomatis di setiap
 * halaman dashboard lewat `PushNotificationBell` (lihat
 * src/components/push/PushNotificationBell.tsx, efek "check" di baris
 * ~46) — jadi syarat instalabilitas (manifest + service worker) sudah
 * terpenuhi tanpa perubahan tambahan di sana.
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
    background_color: "#09090b",
    theme_color: "#6366F1",
    lang: "id",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
