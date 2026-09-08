import type { ReactNode } from "react";
import { BRAND_GRADIENT } from "@/lib/navigation";

/**
 * Shell untuk halaman publik /login & /register — sengaja terpisah dari
 * AppShell (Sidebar/Topbar dashboard) karena rute ini dipakai SEBELUM
 * pengguna punya sesi. Middleware (src/middleware.ts) yang menjaga supaya
 * pengguna yang sudah login tidak bisa membuka halaman ini lagi.
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
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl text-lg font-extrabold text-white shadow-lg"
            style={{ background: BRAND_GRADIENT }}
          >
            M
          </div>
          <h1 className="mt-4 text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            MagnaSuperApp
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Magnative &middot; Magnarent &middot; Production
          </p>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-7 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/30">
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
          &copy; {new Date().getFullYear()} Magna Technology. Internal use only.
        </p>
      </div>
    </div>
  );
}
