import Link from "next/link";
import { MODULES } from "@/lib/navigation";

/**
 * Dashboard Hub — membaca dari `MODULES` (sumber kebenaran yang sama dengan
 * Sidebar), termasuk warna gradient tiap modul untuk badge ikon & strip kartu.
 */
export default function DashboardHubPage() {
  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
          Unified Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          Dashboard Hub
        </h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
          Pilih modul untuk masuk — navigasi di dalam modul akan tetap terbuka lewat
          sub-navigation bar tanpa kembali ke sini.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className="group relative overflow-hidden rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-zinc-900"
            >
              <span
                className="absolute inset-x-0 top-0 h-1.5"
                style={{ background: mod.gradient }}
              />
              <div
                className="grid h-12 w-12 place-items-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-110"
                style={{ background: mod.gradient }}
              >
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-base font-bold text-zinc-900 dark:text-white">
                {mod.label}
              </h2>
              <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                {mod.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
