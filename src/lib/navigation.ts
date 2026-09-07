import type { LucideIcon } from "lucide-react";
import { CalendarClock, Factory, Megaphone } from "lucide-react";

export type SubNavItem = {
  label: string;
  href: string;
};

export type ModuleConfig = {
  id: string;
  label: string;
  /** Halaman ringkasan / landing modul, juga dipakai untuk deteksi "sedang aktif" */
  href: string;
  description: string;
  icon: LucideIcon;
  /** CSS gradient — dipakai untuk badge ikon, aksen aktif SubNav, dan strip kartu Hub. */
  gradient: string;
  /** Warna solid representatif (stop pertama gradient), untuk ikon Sidebar & aksen tipis. */
  solid: string;
  /** Kelas Tailwind untuk latar lembut saat item Sidebar aktif (sudah termasuk varian dark). */
  soft: string;
  subnav: SubNavItem[];
};

export const HUB_HREF = "/dashboard";

/** Gradient tri-warna brand — melebur warna ketiga modul, dipakai di logo mark Sidebar. */
export const BRAND_GRADIENT =
  "linear-gradient(135deg, #6366F1 0%, #EC4899 55%, #F59E0B 100%)";

/**
 * Satu sumber kebenaran untuk seluruh navigasi DAN identitas visual tiap modul:
 * - Sidebar & MobileNav membaca daftar ini untuk module switcher
 * - Setiap layout modul membaca `subnav` + `gradient` miliknya sendiri
 * - ModuleHeader & Dashboard Hub membaca `gradient`/`solid`/`icon` untuk aksen visual
 * Tambah modul baru cukup dengan menambah satu entri di sini.
 */
export const MODULES: ModuleConfig[] = [
  {
    id: "magnative",
    label: "Magnative",
    href: "/magnative",
    description: "Manajemen EO, creative agency & media sosial",
    icon: Megaphone,
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
    solid: "#8B5CF6",
    soft: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
    subnav: [
      { label: "Ringkasan", href: "/magnative" },
      { label: "Sosial Media", href: "/magnative/sosial-media" },
      { label: "Klien", href: "/magnative/klien" },
      { label: "Proyek", href: "/magnative/proyek" },
    ],
  },
  {
    id: "magnarent",
    label: "Magnarent",
    href: "/magnarent",
    description: "Rental booking, inventaris & kalender interaktif",
    icon: CalendarClock,
    gradient: "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
    solid: "#3B82F6",
    soft: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
    subnav: [
      { label: "Ringkasan", href: "/magnarent" },
      { label: "Inventaris", href: "/magnarent/inventaris" },
      { label: "Kalender", href: "/magnarent/kalender" },
      { label: "Booking", href: "/magnarent/booking" },
    ],
  },
  {
    id: "production",
    label: "Production",
    href: "/production",
    description: "Produksi booth, interior & material gudang",
    icon: Factory,
    gradient: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
    solid: "#F59E0B",
    soft: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
    subnav: [
      { label: "Ringkasan", href: "/production" },
      { label: "Gudang", href: "/production/gudang" },
      { label: "Material", href: "/production/material" },
      { label: "Jadwal", href: "/production/jadwal" },
    ],
  },
];

/** Cocokkan pathname saat ini ke konfigurasi modulnya (dipakai ModuleHeader, breadcrumb, dst). */
export function getModuleByPath(pathname: string): ModuleConfig | undefined {
  return MODULES.find(
    (mod) => pathname === mod.href || pathname.startsWith(`${mod.href}/`)
  );
}
