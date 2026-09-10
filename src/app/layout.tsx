import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { getCurrentProfile } from "@/lib/supabase/server";
import { cn } from "@/lib/cn";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MagnaSuperApp",
  description: "Dashboard terpadu untuk Magnativ, Magnarent, dan Production",
  // `manifest.ts` (file convention) sudah otomatis di-link Next.js — baris
  // ini eksplisit saja supaya jelas dan aman kalau suatu saat convention-nya
  // berubah. Icon Apple TIDAK ikut convention manifest (iOS Safari
  // mengabaikan `icons` di web manifest untuk Add to Home Screen), jadi
  // wajib didaftarkan terpisah di sini lewat `apple-touch-icon`.
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MagnaSuperApp",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366F1",
};

/**
 * Root layout — font & metadata global, DAN (Tahap 27) pemilihan tema
 * terang/gelap di level paling atas (<html>) supaya berlaku di halaman
 * publik (/login, /register) maupun dashboard. AppShell (Sidebar/Topbar)
 * TIDAK dipasang di sini — lihat `src/app/dashboard/layout.tsx` — supaya
 * rute publik tetap bebas dari chrome dashboard. Font "Plus Jakarta Sans"
 * dipasang lewat next/font/google di root supaya konsisten di seluruh
 * aplikasi (termasuk halaman login).
 *
 * Layout ini async supaya bisa membaca `theme_preference` pengguna yang
 * sedang login (kalau ada sesi) SEBELUM render pertama — hasilnya class
 * "dark" bisa langsung dipasang server-side, tanpa kedipan warna salah
 * sesaat (flash) seperti kalau baru ditentukan di klien belakangan.
 * Kalau belum login atau pilihannya "Ikuti Sistem" (default), server
 * tidak tahu preferensi OS pengunjung — skrip kecil di <head> di bawah
 * yang menentukannya lewat `matchMedia`, dijalankan SEBELUM apa pun
 * digambar (blocking script pertama di <head>), supaya tetap tidak ada
 * flash walau keputusannya baru diambil di browser.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile().catch(() => null);
  const theme = profile?.theme_preference ?? "system";

  return (
    <html
      lang="id"
      className={cn(jakarta.variable, theme === "dark" && "dark")}
      suppressHydrationWarning
    >
      <head>
        {theme === "system" && (
          <script
            // Sengaja inline (bukan file .js terpisah) supaya jalan sinkron
            // sebelum browser sempat menggambar apa pun — kalau dimuat
            // sebagai file eksternal biasa, ada jeda yang bikin sempat
            // kelihatan versi terang dulu baru berubah gelap (flash).
            dangerouslySetInnerHTML={{
              __html:
                "(function(){try{if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark');}}catch(e){}})();",
            }}
          />
        )}
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
