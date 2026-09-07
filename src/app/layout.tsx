import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "MagnaSuperApp",
  description: "Unified dashboard untuk Magnative, Magnarent, dan Production",
};

/**
 * Root layout — sengaja diminimalkan (hanya font & metadata global).
 * AppShell (Sidebar/MobileNav) TIDAK dipasang di sini lagi — pindah ke
 * `src/app/dashboard/layout.tsx` supaya rute "/" tetap bebas dipakai untuk
 * halaman publik (landing page, dsb.) tanpa ikut membawa chrome dashboard.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
