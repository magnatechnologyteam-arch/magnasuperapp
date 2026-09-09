import Link from "next/link";
import { Home, SearchX } from "lucide-react";
import { BRAND_GRADIENT } from "@/lib/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";

/**
 * Halaman 404 bermerek — tanpa file ini Next.js menampilkan halaman "404"
 * generik bawaan framework. Server Component biasa (tidak perlu interaktif),
 * dipakai untuk SEMUA rute yang tidak ketemu di seluruh aplikasi (baik yang
 * di luar maupun di dalam `/dashboard/**`, karena Next.js belum mendukung
 * `not-found.tsx` bersarang mem-preserve layout di atasnya untuk kasus
 * "route tidak match sama sekali" seperti ini).
 */
export default function NotFound() {
  return (
    <div className="app-backdrop relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div
        className="animate-blob pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: BRAND_GRADIENT }}
        aria-hidden
      />
      <div className="relative w-full max-w-md animate-fade-up text-center">
        <div className="mb-6 flex flex-col items-center">
          <BrandLogo size={56} rounded="rounded-2xl" />
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-7 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/30">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
            <SearchX className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-extrabold text-zinc-900 dark:text-white">Halaman tidak ditemukan</h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Alamat yang Anda tuju tidak ada atau sudah dipindahkan.
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: BRAND_GRADIENT }}
          >
            <Home className="h-4 w-4" />
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
