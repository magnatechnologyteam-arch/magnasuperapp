export type Division = "magnarent" | "magnative" | "production" | "all" | "investor";

export const DIVISION_LABELS: Record<Division, string> = {
  magnarent: "Magnarent",
  magnative: "Magnativ",
  production: "Production",
  all: "Akses Penuh",
  investor: "Investor (Read Only)",
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
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  username: string | null;
  division: Division;
  role: "member" | "admin";
  created_at: string;
};
