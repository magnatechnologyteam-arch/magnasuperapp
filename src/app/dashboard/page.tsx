import Link from "next/link";
import { ArrowUpRight, Boxes, CalendarPlus, Hammer, UserPlus } from "lucide-react";
import { getVisibleModules } from "@/lib/navigation";
import { getCurrentProfile } from "@/lib/supabase/server";

const QUICK_ACTIONS = [
  {
    label: "Buat Booking Baru",
    href: "/dashboard/magnarent/booking",
    icon: CalendarPlus,
    accent: "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
    moduleId: "magnarent",
  },
  {
    label: "Tambah Klien",
    href: "/dashboard/magnative/klien",
    icon: UserPlus,
    accent: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
    moduleId: "magnative",
  },
  {
    label: "Cek Stok Gudang",
    href: "/dashboard/production/material",
    icon: Boxes,
    accent: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
    moduleId: "production",
  },
  {
    label: "Tracking Proyek Booth",
    href: "/dashboard/production/proyek",
    icon: Hammer,
    accent: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
    moduleId: "production",
  },
];

/**
 * Dashboard Hub — membaca dari `getVisibleModules(division)` (sumber
 * kebenaran yang sama dengan Sidebar), jadi staf satu bagian cuma melihat
 * modul & aksi cepat untuk bagiannya sendiri, sementara akses penuh
 * (Owner/Finance/Investor) tetap melihat semuanya.
 */
export default async function DashboardHubPage() {
  const profile = await getCurrentProfile();
  const firstName = (profile?.full_name?.trim() || profile?.email?.split("@")[0] || "").split(" ")[0];

  const modules = getVisibleModules(profile?.division);
  const visibleModuleIds = new Set(modules.map((mod) => mod.id));
  const quickActions = QUICK_ACTIONS.filter((action) => visibleModuleIds.has(action.moduleId));

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 animate-fade-up">
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
          Unified Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          {firstName ? `Selamat datang, ${firstName}` : "Dashboard Hub"}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
          Pilih modul untuk masuk — navigasi di dalam modul akan tetap terbuka lewat
          sub-navigation bar tanpa kembali ke sini.
        </p>
      </div>

      {quickActions.length > 0 && (
        <div className="mb-8 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Mulai Cepat
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-zinc-900"
                >
                  <div
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white transition-transform group-hover:scale-110"
                    style={{ background: action.accent }}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                    {action.label}
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-zinc-500 dark:text-zinc-600" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        Modul
      </p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod, i) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className="group animate-fade-up relative overflow-hidden rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-zinc-900"
              style={{ animationDelay: `${120 + i * 60}ms` }}
            >
              <span
                className="absolute inset-x-0 top-0 h-1.5"
                style={{ background: mod.gradient }}
              />
              <div className="flex items-start justify-between">
                <div
                  className="grid h-12 w-12 place-items-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-110"
                  style={{ background: mod.gradient }}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-zinc-500 dark:text-zinc-600" />
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
