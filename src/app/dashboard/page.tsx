import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Boxes,
  CalendarPlus,
  CalendarRange,
  ClipboardList,
  Hammer,
  PackageSearch,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { getVisibleModules, MODULES } from "@/lib/navigation";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getMagnarentSummary, getMagnativeSummary, getProductionSummary, getReminders } from "@/lib/dashboard/summary";
import { QuickStatCard } from "@/components/dashboard/QuickStatCard";
import { GLASS_BORDER, GLASS_SURFACE, GLASS_SURFACE_STRONG } from "@/lib/glass";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n/dictionary";

type StatCard = {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  accent: string;
  href: string;
  warn?: boolean;
};

// Tahap 31: `accent` tidak lagi ditulis manual per aksi (sebelumnya biru/
// ungu/amber generik, tidak nyambung dengan warna resmi tiap divisi) —
// sekarang diambil langsung dari `mod.gradient` lewat `moduleId` saat
// render (lihat pemakaian di bawah), supaya senada dengan logo resmi dan
// otomatis ikut berubah kalau warna divisi di navigation.ts diubah lagi.
const QUICK_ACTIONS = [
  {
    label: "Buat Booking Baru",
    href: "/dashboard/magnarent/booking",
    icon: CalendarPlus,
    moduleId: "magnarent",
  },
  {
    label: "Tambah Klien",
    href: "/dashboard/magnative/klien",
    icon: UserPlus,
    moduleId: "magnative",
  },
  {
    label: "Cek Stok Gudang",
    href: "/dashboard/production/material",
    icon: Boxes,
    moduleId: "production",
  },
  {
    label: "Tracking Proyek Booth",
    href: "/dashboard/production/proyek",
    icon: Hammer,
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
  const locale = profile?.language_preference ?? "id";

  // Investor punya dashboard sendiri (read only lintas divisi + kotak masuk
  // Pengajuan Modal) — bukan Hub biasa yang isinya kartu modul operasional
  // yang toh tidak bisa dia buka (lihat middleware.ts & getVisibleModules).
  if (profile?.division === "investor") {
    redirect("/dashboard/investor");
  }

  const firstName = (profile?.full_name?.trim() || profile?.email?.split("@")[0] || "").split(" ")[0];

  const modules = getVisibleModules(profile?.division);
  const visibleModuleIds = new Set(modules.map((mod) => mod.id));
  const quickActions = QUICK_ACTIONS.filter((action) => visibleModuleIds.has(action.moduleId));

  const [magnarentSummary, magnativeSummary, productionSummary, reminders] = await Promise.all([
    visibleModuleIds.has("magnarent") ? getMagnarentSummary() : Promise.resolve(null),
    visibleModuleIds.has("magnative") ? getMagnativeSummary() : Promise.resolve(null),
    visibleModuleIds.has("production") ? getProductionSummary() : Promise.resolve(null),
    getReminders(visibleModuleIds),
  ]);

  // Tahap 31: accent kartu Ringkasan Cepat diambil dari MODULES (warna resmi
  // tiap divisi), bukan biru/ungu/amber generik seperti sebelumnya — supaya
  // ikon di sini juga senada dengan logo. Warna kedua per divisi dipetik dari
  // gradient resmi divisi itu sendiri (bukan warna baru), jadi dua kartu per
  // divisi tetap terasa beda tapi tetap satu keluarga warna. Untuk "Stok
  // Menipis", merah tetap dipakai KHUSUS saat stoknya memang menipis (sinyal
  // peringatan universal) — kalau aman, ikutnya warna emas Production.
  const magnarentModule = modules.find((m) => m.id === "magnarent");
  const magnativeModule = modules.find((m) => m.id === "magnative");
  const productionModule = modules.find((m) => m.id === "production");

  const statCards: StatCard[] = [];
  if (magnarentSummary) {
    statCards.push(
      {
        label: t(locale, "Booking Aktif"),
        value: magnarentSummary.bookingAktif,
        hint: t(locale, "Menunggu & dikonfirmasi"),
        icon: CalendarRange,
        accent: magnarentModule?.solid ?? "#E5484D",
        href: "/dashboard/magnarent/booking",
      },
      {
        label: t(locale, "Booking Bulan Ini"),
        value: magnarentSummary.bookingBulanIni,
        hint: t(locale, "Sejak tanggal 1 bulan ini"),
        icon: ClipboardList,
        // Navy dari logo resmi Magnarent (pasangan warna merahnya di gradient)
        accent: "#262C3A",
        href: "/dashboard/magnarent/booking",
      }
    );
  }
  if (magnativeSummary) {
    statCards.push(
      {
        label: t(locale, "Proyek Berjalan"),
        value: magnativeSummary.proyekBerjalan,
        hint: t(locale, "Status: Berjalan"),
        icon: Hammer,
        accent: magnativeModule?.solid ?? "#0B7A63",
        href: "/dashboard/magnative/proyek",
      },
      {
        label: t(locale, "Konten 7 Hari Ke Depan"),
        value: magnativeSummary.kontenMingguIni,
        hint: t(locale, "Terjadwal tayang minggu ini"),
        icon: CalendarPlus,
        // Teal lebih terang, ujung gradient resmi Magnativ
        accent: "#14B8A6",
        href: "/dashboard/magnative/sosial-media",
      }
    );
  }
  if (productionSummary) {
    statCards.push(
      {
        label: t(locale, "Proyek Booth Aktif"),
        value: productionSummary.proyekAktif,
        hint: t(locale, "Desain sampai Instalasi"),
        icon: PackageSearch,
        accent: productionModule?.solid ?? "#B8860B",
        href: "/dashboard/production/proyek",
      },
      {
        label: t(locale, "Stok Menipis"),
        value: productionSummary.stokMenipis,
        hint: t(locale, "Di titik minimum atau di bawahnya"),
        icon: AlertTriangle,
        accent: productionSummary.stokMenipis > 0 ? "#EF4444" : (productionModule?.solid ?? "#B8860B"),
        href: "/dashboard/production/material",
        warn: productionSummary.stokMenipis > 0,
      }
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div
        className={cn(
          "relative mb-8 isolate overflow-hidden rounded-3xl border p-6 md:p-8",
          GLASS_SURFACE_STRONG,
          GLASS_BORDER
        )}
      >
        {/* Tahap 31: blob dekoratif ikut disamakan dengan warna resmi (emas
            Production & teal Magnativ) — sebelumnya indigo/fuchsia generik
            yang tidak nyambung sama sekali dengan identitas brand. */}
        <span
          className="animate-blob pointer-events-none absolute -top-16 left-10 -z-10 h-40 w-40 rounded-full bg-[#D4AF37]/20 blur-3xl"
          aria-hidden
        />
        <span
          className="animate-blob pointer-events-none absolute -right-6 -bottom-16 -z-10 h-40 w-40 rounded-full bg-[#0B7A63]/15 blur-3xl"
          style={{ animationDelay: "3s" }}
          aria-hidden
        />
        <div className="relative animate-fade-up">
          <h1 className="text-shine mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
            {firstName ? `${t(locale, "Selamat Datang")} ${firstName}!` : t(locale, "Selamat Datang di MagnaSuperApp!")}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
            {t(locale, "Semangat kerja hari ini — yuk pilih menu di bawah.")}
          </p>
        </div>
      </div>

      {reminders.length > 0 && (
        <div className="mb-8 animate-fade-up">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            <Bell className="h-3.5 w-3.5" />
            {t(locale, "Pengingat")} ({reminders.length})
          </p>
          <div className={cn("divide-y overflow-hidden rounded-2xl border", GLASS_SURFACE, GLASS_BORDER)}>
            {reminders.map((r) => (
              <Link
                key={r.id}
                href={r.href}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] sm:px-5"
              >
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full",
                    r.severity === "danger"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  )}
                >
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">{t(locale, r.title)}</p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{r.detail}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {statCards.length > 0 && (
        <div className="mb-8" style={{ animationDelay: "30ms" }}>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {t(locale, "Ringkasan Cepat")}
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
            {t(locale, "Mulai Cepat")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const accentGradient =
                modules.find((m) => m.id === action.moduleId)?.gradient ??
                MODULES.find((m) => m.id === action.moduleId)?.gradient;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl border p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md",
                    GLASS_SURFACE,
                    GLASS_BORDER
                  )}
                >
                  <div
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white transition-transform group-hover:scale-110"
                    style={{ background: accentGradient }}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                    {t(locale, action.label)}
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-zinc-500 dark:text-zinc-600" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {t(locale, "Menu Kerja")}
      </p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod, i) => {
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className={cn(
                "group animate-fade-up relative overflow-hidden rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-xl",
                GLASS_BORDER
              )}
              style={{ animationDelay: `${120 + i * 60}ms` }}
            >
              {/* Tahap 31: sampul kartu modul diganti dari foto stok generik
                  jadi latar warna resmi divisi + logo resmi-nya sendiri
                  (menggantikan placeholder di public/images/placeholders/) —
                  supaya tiap kartu langsung terasa identitas Magnativ/
                  Magnarent/Production yang sebenarnya, bukan foto dummy.
                  Logo ditaruh di atas panel putih (bukan langsung di atas
                  gradient) karena warna logo & warna gradient-nya berasal
                  dari sumber yang SAMA (Tahap 31) — tanpa panel putih, logo
                  Magnativ (teal di atas teal) & Production (emas di atas
                  emas) nyaris tak kelihatan.
                  Tahap 31 lanjutan: panel putihnya masih terasa "nempel
                  rata" di beberapa layar — sekarang dikasih shadow berlapis
                  (elevasi lebih tinggi + terasa melayang) DAN drop-shadow
                  langsung di gambar logo (ikut bentuk transparansi PNG-nya,
                  bukan cuma kotak) supaya logo terasa timbul/3D, jelas
                  terpisah dari warna gradient di belakangnya. */}
              <div
                className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden p-8"
                style={{ background: mod.gradient }}
              >
                <div className="flex items-center justify-center rounded-2xl bg-white px-5 py-4 shadow-[0_20px_40px_-8px_rgba(0,0,0,0.45)] ring-1 ring-black/5 transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105">
                  {/* eslint-disable-next-line @next/next/no-img-element -- logo lokal statis, aspect ratio beda-beda per divisi */}
                  <img
                    src={mod.logo}
                    alt={mod.label}
                    className="max-h-12 w-auto max-w-[11rem] object-contain drop-shadow-[0_6px_6px_rgba(0,0,0,0.25)]"
                  />
                </div>
              </div>
              <div className={cn("border-t p-6", GLASS_SURFACE, GLASS_BORDER)}>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900 dark:text-white">{t(locale, mod.label)}</h2>
                    <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{t(locale, mod.description)}</p>
                  </div>
                  <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-zinc-500 dark:text-zinc-600" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
