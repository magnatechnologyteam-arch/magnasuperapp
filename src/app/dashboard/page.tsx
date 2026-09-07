import Link from "next/link";
import { MODULES } from "@/lib/navigation";
import { ACCENT_CLASSES } from "@/lib/navigation";

/**
 * Contoh Dashboard Hub yang membaca dari `MODULES` (sumber kebenaran yang sama
 * dengan Sidebar). Jika Anda sudah punya halaman Hub sendiri, cukup ambil pola
 * render kartu di bawah ini — tidak perlu mengganti seluruh halaman.
 */
export default function DashboardHubPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">
        Dashboard Hub
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Pilih modul untuk masuk — navigasi di dalam modul akan tetap terbuka lewat
        sub-navigation bar tanpa kembali ke sini.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          const accent = ACCENT_CLASSES[mod.accent];
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className="group rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div
                className={`grid h-10 w-10 place-items-center rounded-lg ${accent.active}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-sm font-semibold text-slate-900">{mod.label}</h2>
              <p className="mt-1 text-sm text-slate-500">{mod.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
