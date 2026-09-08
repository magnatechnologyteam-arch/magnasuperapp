"use client";

import { BarChart3, Boxes, CalendarCheck2, Hammer, PackageCheck, Warehouse } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { formatRupiah } from "@/lib/magnarent/pricing";

const ACCENT_BLUE = "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)";
const ACCENT_VIOLET = "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)";
const ACCENT_AMBER = "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)";
const ACCENT_EMERALD = "linear-gradient(135deg, #10B981 0%, #22D3EE 100%)";

/**
 * Grid StatCard di Laporan Lintas Divisi ditarik ke Client Component
 * terpisah dari `page.tsx` (Server Component) dengan sengaja: StatCard
 * memakai hook (animasi hitung-naik), jadi harus "use client" — dan
 * komponen ikon Lucide (fungsi) TIDAK BISA lewat sebagai prop dari Server
 * ke Client Component (cuma data biasa & elemen React yang boleh). Solusinya
 * di sini: cuma ANGKA MENTAH yang dikirim dari page.tsx, lalu format mata
 * uang & pemilihan ikon dilakukan di dalam file client ini sendiri.
 */
export function LaporanStatGrid({
  nilaiTerkonfirmasi,
  nilaiMenunggu,
  budgetProyekAktif,
  budgetBoothAktif,
  nilaiStokGudang,
  totalPotensi,
}: {
  nilaiTerkonfirmasi: number;
  nilaiMenunggu: number;
  budgetProyekAktif: number;
  budgetBoothAktif: number;
  nilaiStokGudang: number;
  totalPotensi: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        label="Nilai Booking Terkonfirmasi"
        value={formatRupiah(nilaiTerkonfirmasi)}
        icon={CalendarCheck2}
        accent={ACCENT_BLUE}
        ratio={
          totalPotensi > 0
            ? { value: nilaiTerkonfirmasi, total: totalPotensi, caption: "dari total potensi ketiga divisi" }
            : undefined
        }
      />
      <StatCard
        label="Nilai Booking Menunggu Konfirmasi"
        value={formatRupiah(nilaiMenunggu)}
        icon={PackageCheck}
        accent={ACCENT_BLUE}
        delayMs={40}
      />
      <StatCard
        label="Budget Proyek Magnative Aktif"
        value={formatRupiah(budgetProyekAktif)}
        icon={Hammer}
        accent={ACCENT_VIOLET}
        delayMs={80}
        ratio={
          totalPotensi > 0
            ? { value: budgetProyekAktif, total: totalPotensi, caption: "dari total potensi ketiga divisi" }
            : undefined
        }
      />
      <StatCard
        label="Budget Proyek Booth Aktif"
        value={formatRupiah(budgetBoothAktif)}
        icon={Boxes}
        accent={ACCENT_AMBER}
        delayMs={120}
        ratio={
          totalPotensi > 0
            ? { value: budgetBoothAktif, total: totalPotensi, caption: "dari total potensi ketiga divisi" }
            : undefined
        }
      />
      <StatCard
        label="Nilai Stok Gudang Production"
        value={formatRupiah(nilaiStokGudang)}
        icon={Warehouse}
        accent={ACCENT_EMERALD}
        delayMs={160}
      />
      <StatCard
        label="Total Potensi Pendapatan"
        value={formatRupiah(totalPotensi)}
        icon={BarChart3}
        accent={ACCENT_EMERALD}
        delayMs={200}
      />
    </div>
  );
}
