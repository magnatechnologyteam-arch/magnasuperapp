import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/cn";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CalendarPlus,
  CalendarRange,
  ClipboardList,
  Hammer,
  PackageSearch,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { getVisibleModules } from "@/lib/navigation";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getMagnarentSummary, getMagnativeSummary, getProductionSummary } from "@/lib/dashboard/summary";
import { QuickStatCard } from "@/components/dashboard/QuickStatCard";

type StatCard = {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  accent: string;
  href: string;
  warn?: boolean;
};

// Foto sampul per modul — placeholder/dummy on-brand sementara (lihat
// public/images/placeholders/ dan PlaceholderGallery di halaman
// Inventaris/Proyek Booth untuk keterangan foto asli).
const MODULE_BANNERS: Record<string, string> = {
  magnarent: "/images/placeholders/module-magnarent.jpg",
  magnative: "/images/placeholders/module-magnative.jpg",
  production: "/images/placeholders/module-production.jpg",
};

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
 * (Owner/Finance/Investor) tetap melihat semuanya. "Ringkasan Cepat" di
 * bawah judul membaca angka asli dari Supabase (bukan mock) lewat
 * `src/lib/dashboard/summary.ts` — cuma diambil untuk modul yang memang
 * terlihat oleh staf yang login, supaya tidak ada query sia-sia ke modul
 * yang RLS-nya akan menolak kalau tetap dipanggil.
 */
export default async function DashboardHubPage() {
  const profile = await getCurrentProfile();
  const firstName = (profile?.full_name?.trim() || profile?.email?.split("@")[0] || "").split(" ")[0];

  const modules = getVisibleModules(profile?.division);
  const visibleModuleIds = new Set(modules.map((mod) => mod.id));
  const quickActions = QUICK_ACTIONS.filter((action) => visibleModuleIds.has(action.moduleId));

  const [magnarentSummary, magnativeSummary, productionSummary] = await Promise.all([
    visibleModuleIds.has("magnarent") ? getMagnarentSummary() : Promise.resolve(null),
    visibleModuleIds.has("magnative") ? getMagnativeSummary() : Promise.resolve(null),
    visibleModuleIds.has("production") ? getProductionSummary() : Promise.resolve(null),
  ]);

  const statCards: StatCard[] = [];
  if (magnarentSummary) {
    statCards.push(
      {
        label: "Booking Aktif",
        value: magnarentSummary.bookingAktif,
        hint: "Menunggu & dikonfirmasi",
        icon: CalendarRange,
        accent: "#3B82F6",
        href: "/dashboard/magnarent/booking",
      },
      {
        label: "Booking Bulan Ini",
        value: magnarentSummary.bookingBulanIni,
        hint: "Sejak tanggal 1 bulan ini",
        icon: ClipboardList,
        accent: "#06B6D4",
        href: "/dashboard/magnarent/booking",
      }
    );
  }
  if (magnativeSummary) {
    statCards.push(
      {
        label: "Proyek Berjalan",
        value: magnativeSummary.proyekBerjalan,
        hint: "Status: Berjalan",
        icon: Hammer,
        accent: "#8B5CF6",
        href: "/dashboard/magnative/proyek",
      },
      {
        label: "Konten 7 Hari Ke Depan",
        value: magnativeSummary.kontenMingguIni,
        hint: "Terjadwal tayang minggu ini",
        icon: CalendarPlus,
        accent: "#EC4899",
        href: "/dashboard/magnative/sosial-media",
      }
    );
  }
  if (productionSummary) {
    statCards.push(
      {
        label: "Proyek Booth Aktif",
        value: productionSummary.proyekAktif,
        hint: "Desain sampai Instalasi",
        icon: PackageSearch,
        accent: "#F59E0B",
        href: "/dashboard/production/proyek",
      },
      {
        label: "Stok Menipis",
        value: productionSummary.stokMenipis,
        hint: "Di titik minimum atau di bawahnya",
        icon: AlertTriangle,
        accent: "#EF4444",
        href: "/dashboard/production/material",
        warn: productionSummary.stokMenipis > 0,
      }
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="relative mb-8 isolate overflow-hidden rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900 md:p-8">
        <span
          className="animate-blob pointer-events-none absolute -top-16 left-10 -z-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl"
          aria-hidden
        />
        <span
          className="animate-blob pointer-events-none absolute -right-6 -bottom-16 -z-10 h-40 w-40 rounded-full bg-fuchsia-500/15 blur-3xl"
          style={{ animationDelay: "3s" }}
          aria-hidden
        />
        <div className="relative animate-fade-up">
          <h1 className="text-shine mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
            {firstName ? `Selamat Datang ${firstName}!` : "Selamat Datang di MagnaSuperApp!"}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
            Semangat kerja hari ini — yuk pilih menu di bawah.
          </p>
        </div>
      </div>

      {statCards.length > 0 && (
        <div className="mb-8" style={{ animationDelay: "30ms" }}>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Ringkasan Cepat
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <QuickStatCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  hint={card.hint}
                  accent={card.accent}
                  href={card.href}
                  warn={card.warn}
                  delayMs={i * 60}
                  icon={<Icon className="h-5 w-5" />}
                />
              );
            })}
          </div>
        </div>
      )}

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
        Menu Kerja
      </p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod, i) => {
          const Icon = mod.icon;
          const banner = MODULE_BANNERS[mod.id];
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className="group animate-fade-up relative overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-zinc-900"
              style={{ animationDelay: `${120 + i * 60}ms` }}
            >
              {banner ? (
                <div className="relative aspect-[16/9] w-full overflow-hidden">
                  <Image
                    src={banner}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-14"
                    style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent)",
                    }}
                  />
                  <div
                    className="absolute -bottom-5 left-5 grid h-12 w-12 place-items-center rounded-xl text-white shadow-md ring-4 ring-white transition-transform group-hover:scale-110 dark:ring-zinc-900"
                    style={{ background: mod.gradient }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              ) : (
                <span
                  className="absolute inset-x-0 top-0 h-1.5"
                  style={{ background: mod.gradient }}
                />
              )}
              <div className={banner ? "p-6 pt-8" : "p-6"}>
                {!banner && (
                  <div className="flex items-start justify-between">
                    <div
                      className="grid h-12 w-12 place-items-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-110"
                      style={{ background: mod.gradient }}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-zinc-500 dark:text-zinc-600" />
                  </div>
                )}
                <div className={banner ? "flex items-start justify-between" : "contents"}>
                  <div>
                    <h2 className={cn("text-base font-bold text-zinc-900 dark:text-white", !banner && "mt-4")}>
                      {mod.label}
                    </h2>
                    <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                      {mod.description}
                    </p>
                  </div>
                  {banner && (
                    <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-zinc-500 dark:text-zinc-600" />
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
