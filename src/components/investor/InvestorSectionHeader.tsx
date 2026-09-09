import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";

/**
 * Header seragam untuk tiap halaman rincian investor (Magnarent/Magnativ/
 * Production/Keuangan) — selalu ada tautan "Kembali ke Ringkasan" karena
 * halaman-halaman ini SENGAJA tidak ikut nongol di SubNav utama (supaya
 * SubNav investor tetap cuma "Ringkasan"/"Pengajuan Modal", tidak penuh) —
 * satu-satunya jalan masuk ke sini adalah klik kartu di Ringkasan.
 */
export function InvestorSectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  accent,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <div className="mb-6">
      <Link
        href="/dashboard/investor"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Ringkasan
      </Link>
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <span
            className="absolute -inset-1.5 animate-pulse rounded-2xl opacity-30 blur-lg"
            style={{ background: accent }}
            aria-hidden
          />
          <div
            className="relative grid h-12 w-12 place-items-center rounded-2xl text-white shadow-sm"
            style={{ background: accent }}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-500 dark:text-emerald-400">
            {eyebrow}
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">{title}</h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
      </div>
    </div>
  );
}
