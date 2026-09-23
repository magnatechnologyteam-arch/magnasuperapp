export type Division = "magnarent" | "magnative" | "production" | "all" | "investor" | "finance";

export const DIVISION_LABELS: Record<Division, string> = {
  magnarent: "Magnarent",
  magnative: "Magnativ",
  production: "Production",
  all: "Akses Penuh",
  investor: "Investor",
  // Peran baru: akses HANYA ke halaman keuangan (Piutang & Pendapatan,
  // Akuntansi, Laba-Rugi, Neraca, Arus Kas, Faktur) — beda dari "all" yang
  // juga membuka Kelola Pengguna/Pengajuan Modal/Status Sistem. Lihat
  // migrasi 0061_finance_role.sql untuk detail celah yang diperbaiki.
  finance: "Finance",
};

/**
 * Warna badge per divisi — dipakai di halaman Kelola Pengguna supaya bisa
 * langsung dipindai sekilas siapa yang akses penuh (emas, sengaja beda
 * dari warna modul manapun) vs siapa yang cuma satu divisi (warna
 * mengikuti warna modul terkait di navigation.ts, biar konsisten).
 */
export const DIVISION_BADGE_CLASSES: Record<Division, string> = {
  magnarent: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  magnative: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
  production: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
  all: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  investor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  // Violet -- belum dipakai warna lain manapun (magnarent sky, magnative
  // fuchsia, production orange, all amber, investor emerald).
  finance: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
};

export type ThemePreference = "light" | "dark" | "system";
export type LanguagePreference = "id" | "en" | "ms" | "zh" | "ja" | "ko" | "ar" | "fr" | "th";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  username: string | null;
  division: Division;
  role: "member" | "admin";
  avatar_url: string | null;
  theme_preference: ThemePreference;
  language_preference: LanguagePreference;
  created_at: string;
};
