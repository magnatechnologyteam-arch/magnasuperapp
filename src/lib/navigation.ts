import type { LucideIcon } from "lucide-react";
import { CalendarClock, Factory, Megaphone } from "lucide-react";

export type SubNavItem = {
  label: string;
  href: string;
};

export type ModuleConfig = {
  id: string;
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  solid: string;
  soft: string;
  subnav: SubNavItem[];
};

export const HUB_HREF = "/dashboard";

export const BRAND_GRADIENT =
  "linear-gradient(135deg, #6366F1 0%, #EC4899 55%, #F59E0B 100%)";

export const MODULES: ModuleConfig[] = [
  {
    id: "magnative",
    label: "Magnativ",
    href: "/dashboard/magnative",
    description: "Manajemen EO, creative agency & media sosial",
    icon: Megaphone,
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
    solid: "#8B5CF6",
    soft: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
    subnav: [
      { label: "Ringkasan", href: "/dashboard/magnative" },
      { label: "Sosial Media", href: "/dashboard/magnative/sosial-media" },
      { label: "Klien", href: "/dashboard/magnative/klien" },
      { label: "Proyek", href: "/dashboard/magnative/proyek" },
    ],
  },
  {
    id: "magnarent",
    label: "Magnarent",
    href: "/dashboard/magnarent",
    description: "Rental booking, inventaris & kalender interaktif",
    icon: CalendarClock,
    gradient: "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
    solid: "#3B82F6",
    soft: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
    subnav: [
      { label: "Ringkasan", href: "/dashboard/magnarent" },
      { label: "Inventaris", href: "/dashboard/magnarent/inventaris" },
      { label: "Kalender", href: "/dashboard/magnarent/kalender" },
      { label: "Booking", href: "/dashboard/magnarent/booking" },
      { label: "Perputaran", href: "/dashboard/magnarent/utilisasi" },
    ],
  },
  {
    id: "production",
    label: "Production",
    href: "/dashboard/production",
    description: "Produksi booth, interior & material gudang",
    icon: Factory,
    gradient: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
    solid: "#F59E0B",
    soft: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
    subnav: [
      { label: "Ringkasan", href: "/dashboard/production" },
      { label: "Material", href: "/dashboard/production/material" },
      { label: "Proyek Booth", href: "/dashboard/production/proyek" },
      { label: "Jadwal", href: "/dashboard/production/jadwal" },
      { label: "Pemakaian", href: "/dashboard/production/pemakaian" },
      { label: "Pembelian", href: "/dashboard/production/pembelian" },
    ],
  },
];

export function getModuleByPath(pathname: string): ModuleConfig | undefined {
  return MODULES.find(
    (mod) => pathname === mod.href || pathname.startsWith(`${mod.href}/`)
  );
}

/**
 * Modul yang boleh dilihat pengguna sesuai divisinya — dipakai Sidebar,
 * MobileNav, dan Hub supaya staf satu bagian tidak melihat tautan ke modul
 * lain yang toh akan diblokir middleware kalau diklik. `division` "all"
 * (Owner/Finance/Investor) atau kosong (fallback aman) melihat semuanya.
 */
export function getVisibleModules(division?: string | null): ModuleConfig[] {
  if (division === "all") return MODULES;
  // Investor punya area sendiri (/dashboard/investor, read only lintas
  // divisi) — bukan modul operasional biasa, jadi sengaja tidak ditampilkan
  // di sini (lihat Sidebar.tsx untuk tautan investor).
  if (division === "investor") return [];
  // Fail-closed: divisi tidak dikenali/kosong dianggap akses paling
  // terbatas, konsisten dengan default di getCurrentProfile().
  return MODULES.filter((mod) => mod.id === (division ?? "production"));
}
