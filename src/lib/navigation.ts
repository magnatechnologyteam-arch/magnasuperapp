import type { LucideIcon } from "lucide-react";
import { CalendarClock, Factory, LayoutGrid, Megaphone } from "lucide-react";

export type SubNavItem = {
  label: string;
  href: string;
};

export type ModuleAccent = "violet" | "blue" | "amber";

export type ModuleConfig = {
  id: string;
  label: string;
  /** Halaman ringkasan / landing modul, juga dipakai untuk deteksi "sedang aktif" */
  href: string;
  description: string;
  icon: LucideIcon;
  accent: ModuleAccent;
  subnav: SubNavItem[];
};

export const HUB_HREF = "/dashboard";

/**
 * Satu sumber kebenaran untuk seluruh navigasi:
 * - Sidebar (module switcher) membaca daftar ini
 * - Setiap layout modul membaca `subnav` miliknya sendiri
 * - Dashboard Hub membaca daftar ini untuk render kartu modul
 * Tambah modul baru cukup dengan menambah satu entri di sini.
 */
export const MODULES: ModuleConfig[] = [
  {
    id: "magnative",
    label: "Magnative",
    href: "/magnative",
    description: "Manajemen EO, creative agency & media sosial",
    icon: Megaphone,
    accent: "violet",
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
    accent: "blue",
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
    accent: "amber",
    subnav: [
      { label: "Ringkasan", href: "/production" },
      { label: "Gudang", href: "/production/gudang" },
      { label: "Material", href: "/production/material" },
      { label: "Jadwal", href: "/production/jadwal" },
    ],
  },
];

/** Kelas Tailwind ditulis statis (bukan diinterpolasi) agar tetap terdeteksi oleh JIT compiler. */
export const ACCENT_CLASSES: Record<
  ModuleAccent,
  { active: string; dot: string; icon: string }
> = {
  violet: {
    active: "bg-violet-50 text-violet-700",
    dot: "bg-violet-500",
    icon: "text-violet-600",
  },
  blue: {
    active: "bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
    icon: "text-blue-600",
  },
  amber: {
    active: "bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    icon: "text-amber-600",
  },
};

export function getModuleGridIcon() {
  return LayoutGrid;
}

/** Cocokkan pathname saat ini ke konfigurasi modulnya (untuk breadcrumb, judul halaman, dst). */
export function getModuleByPath(pathname: string): ModuleConfig | undefined {
  return MODULES.find(
    (mod) => pathname === mod.href || pathname.startsWith(`${mod.href}/`)
  );
}
