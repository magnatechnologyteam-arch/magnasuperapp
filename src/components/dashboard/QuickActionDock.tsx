import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { GLASS_BORDER, GLASS_SURFACE_STRONG } from "@/lib/glass";

/**
 * Tahap 46: "Mulai Cepat" di Dashboard Hub sebelumnya berupa grid kartu
 * persegi panjang biasa — sekarang jadi baris "dock" kaca ala iPhone
 * (ikon persegi bulat + gradasi resmi divisi, label di bawahnya), sesuai
 * model layout kedua yang disepakati lewat mockup. Tidak butuh "use client"
 * karena tidak ada state/animasi JS, cuma transisi CSS biasa lewat Tailwind.
 *
 * Tahap 48: awalnya `overflow-x-auto` + item lebar tetap (dock ala iOS
 * yang di-scroll horizontal kalau ikonnya kebanyakan) — TAPI jumlah aksi di
 * sini biasanya cuma segelintir (3-6, tergantung modul yang user akses),
 * jadi hasilnya malah numpuk rapat ke KIRI dengan sisa ruang kosong lebar
 * di kanan (laporan Owner: "ke kiri semuanya"). Diganti `flex-wrap` +
 * `justify-center` supaya ikon-ikonnya nyebar rapi di tengah kartu (dan
 * turun ke baris baru kalau suatu saat modul yang di-akses banyak sekali),
 * bukan digulung ke samping.
 */
export function QuickActionDock({
  actions,
}: {
  actions: {
    label: string;
    href: string;
    /** Elemen ikon sudah dirender — lihat catatan yang sama di QuickStatCard.tsx. */
    icon: ReactNode;
    gradient?: string;
  }[];
}) {
  if (actions.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-stretch justify-center gap-1.5 rounded-[28px] border p-3",
        GLASS_SURFACE_STRONG,
        GLASS_BORDER
      )}
    >
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="group flex w-[86px] flex-col items-center gap-2 rounded-2xl px-1.5 py-2 text-center transition-transform hover:-translate-y-1"
        >
          <div
            className="grid h-12 w-12 place-items-center rounded-[16px] text-white shadow-[0_10px_20px_-6px_rgba(0,0,0,0.35)] transition-transform group-hover:scale-105"
            style={{ background: action.gradient }}
          >
            {action.icon}
          </div>
          <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-zinc-600 dark:text-zinc-300">
            {action.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
