/**
 * Util generik lintas-modul (dipakai Magnative, dan modul berikutnya).
 * Magnarent sengaja tidak direfactor ke sini supaya tidak menyentuh kode
 * yang sudah stabil & teruji — util-nya sendiri (src/lib/magnarent/date.ts)
 * isinya identik secara fungsional.
 */

export function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDateID(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const AVATAR_PALETTE = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

/**
 * Nama yang ditampilkan di UI. Kalau `full_name` sudah diisi (lewat
 * halaman Kelola Pengguna), itu yang dipakai apa adanya. Kalau belum —
 * daripada tampil mentah seperti username/email ("aliefaditiyo.n") —
 * di-"rapikan" dulu (titik/underscore jadi spasi, tiap kata dikapital)
 * jadi lebih mirip nama sungguhan ("Aliefaditiyo N"), sambil tetap
 * jelas ini cuma tebakan sementara sampai `full_name` staf yang
 * bersangkutan diisi lengkap oleh admin.
 */
export function formatDisplayName(fullName?: string | null, email?: string | null): string {
  const trimmed = fullName?.trim();
  if (trimmed) return trimmed;

  const local = email?.split("@")[0]?.trim();
  if (!local) return "";

  return local
    .split(/[.\-_]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
