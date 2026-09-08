import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
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
 * Root layout — hanya font & metadata global. AppShell (Sidebar/Topbar)
 * TIDAK dipasang di sini — lihat `src/app/dashboard/layout.tsx` — supaya
 * rute publik seperti "/login" dan "/register" tetap bebas dari chrome
 * dashboard. Font "Plus Jakarta Sans" dipasang lewat next/font/google di
 * root supaya konsisten di seluruh aplikasi (termasuk halaman login).
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
