import type { Metadata } from "next";
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
  description: "Unified dashboard untuk Magnative, Magnarent, dan Production",
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
