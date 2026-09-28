import type { ReactNode } from "react";
import { BRAND_GRADIENT } from "@/lib/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { GLASS_BORDER, GLASS_SURFACE_STRONG } from "@/lib/glass";
import { cn } from "@/lib/cn";

/**
 * Shell untuk halaman publik /login & /register — sengaja terpisah dari
 * AppShell (Sidebar/Topbar dashboard) karena rute ini dipakai SEBELUM
 * pengguna punya sesi. Middleware (src/middleware.ts) yang menjaga supaya
 * pengguna yang sudah login tidak bisa membuka halaman ini lagi.
 *
 * Tahap 46 lanjutan: kartu login sebelumnya `bg-white` OPAK (satu-satunya
 * permukaan di app yang belum ikut "Liquid Glass" Tahap 38/41) — sekarang
 * dipindah ke GLASS_SURFACE_STRONG supaya blob warna brand di belakangnya
 * (sudah ada dari awal, lihat di bawah) ikut tembus & halaman pertama yang
 * dilihat pengguna langsung senada dengan Dashboard Hub setelah login.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-backdrop relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div
        className="animate-blob pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: BRAND_GRADIENT }}
        aria-hidden
      />
      <div
        className="animate-blob pointer-events-none absolute -bottom-32 left-1/2 h-72 w-[32rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: BRAND_GRADIENT, animationDelay: "4s" }}
        aria-hidden
      />

      <div className="relative w-full max-w-md animate-fade-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo size={56} rounded="rounded-2xl" />
          <h1 className="mt-4 text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            MagnaSuperApp
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Magnativ &middot; Magnarent &middot; Production
          </p>
        </div>

        <div className={cn("rounded-3xl border p-7 shadow-xl shadow-black/5 dark:shadow-black/30", GLASS_SURFACE_STRONG, GLASS_BORDER)}>
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
          &copy; {new Date().getFullYear()} Magna Technology. Internal use only.
        </p>
      </div>
    </div>
  );
}
