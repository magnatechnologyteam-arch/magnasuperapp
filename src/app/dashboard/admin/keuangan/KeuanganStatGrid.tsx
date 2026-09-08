"use client";

import { AlertTriangle, Boxes, Hammer, PiggyBank, Sparkles, Wallet2 } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { formatRupiah } from "@/lib/shared/utils";

const ACCENT_ROSE = "linear-gradient(135deg, #F43F5E 0%, #FB923C 100%)";
const ACCENT_EMERALD = "linear-gradient(135deg, #10B981 0%, #22D3EE 100%)";
const ACCENT_SKY = "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)";
const ACCENT_FUCHSIA = "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)";
const ACCENT_AMBER = "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)";

/**
 * Sama pola dengan `LaporanStatGrid`: ditarik ke Client Component terpisah
 * karena StatCard pakai hook animasi hitung-naik, dan komponen ikon Lucide
 * tidak bisa lewat Server→Client sebagai prop — jadi cuma angka mentah yang
 * dikirim dari `page.tsx`, ikon & format dipilih di sini.
 */
export function KeuanganStatGrid({
  totalPiutang,
  totalPendapatan,
  piutangMagnarent,
  piutangMagnative,
  piutangProduction,
  jumlahTertunda,
}: {
  totalPiutang: number;
  totalPendapatan: number;
  piutangMagnarent: number;
  piutangMagnative: number;
  piutangProduction: number;
  jumlahTertunda: number;
}) {
  const totalTerbanyak = totalPiutang + totalPendapatan;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        label="Total Piutang (Belum Bayar + DP)"
        value={formatRupiah(totalPiutang)}
        icon={AlertTriangle}
        accent={ACCENT_ROSE}
        ratio={
          totalTerbanyak > 0
            ? { value: totalPiutang, total: totalTerbanyak, caption: "dari total nilai booking/proyek aktif" }
            : undefined
        }
      />
      <StatCard
        label="Pendapatan Tercatat Lunas"
        value={formatRupiah(totalPendapatan)}
        icon={PiggyBank}
        accent={ACCENT_EMERALD}
        delayMs={40}
        ratio={
          totalTerbanyak > 0
            ? { value: totalPendapatan, total: totalTerbanyak, caption: "dari total nilai booking/proyek aktif" }
            : undefined
        }
      />
      <StatCard
        label="Jumlah Booking/Proyek Tertunda"
        value={String(jumlahTertunda)}
        icon={Sparkles}
        accent={ACCENT_AMBER}
        delayMs={80}
      />
      <StatCard
        label="Piutang Magnarent"
        value={formatRupiah(piutangMagnarent)}
        icon={Wallet2}
        accent={ACCENT_SKY}
        delayMs={120}
      />
      <StatCard
        label="Piutang Magnative"
        value={formatRupiah(piutangMagnative)}
        icon={Boxes}
        accent={ACCENT_FUCHSIA}
        delayMs={160}
      />
      <StatCard
        label="Piutang Production"
        value={formatRupiah(piutangProduction)}
        icon={Hammer}
        accent={ACCENT_AMBER}
        delayMs={200}
      />
    </div>
  );
}
