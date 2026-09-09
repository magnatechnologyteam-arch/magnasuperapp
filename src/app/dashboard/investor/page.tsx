import {
  AlertTriangle,
  CalendarPlus,
  CalendarRange,
  ClipboardList,
  Hammer,
  HandCoins,
  PackageSearch,
  Receipt,
  Wallet2,
} from "lucide-react";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { getMagnarentSummary, getMagnativeSummary, getProductionSummary } from "@/lib/dashboard/summary";
import { formatRupiah } from "@/lib/shared/utils";
import { QuickStatCard } from "@/components/dashboard/QuickStatCard";

/**
 * "Ringkasan" investor — read only lintas divisi (rancangan Owner: "Read
 * Only = menampilkan hasil dari masing-masing divisi, owner, finance dan
 * admin"). Query di sini SAMA PERSIS dengan yang dipakai Dashboard Hub
 * biasa (src/lib/dashboard/summary.ts) — bisa investor pakai berkat policy
 * SELECT tambahan di migrasi 0019, tanpa kode baru di modulnya sendiri.
 */
export default async function InvestorRingkasanPage() {
  const profile = await getCurrentProfile();
  const firstName = (profile?.full_name?.trim() || profile?.email?.split("@")[0] || "").split(" ")[0];

  const supabase = await createClient();
  const [magnarentSummary, magnativeSummary, productionSummary, invoicesRes, pendingRes] = await Promise.all([
    getMagnarentSummary(),
    getMagnativeSummary(),
    getProductionSummary(),
    supabase.from("invoices").select("status, total").returns<{ status: string; total: number }[]>(),
    supabase.from("capital_requests").select("id", { count: "exact", head: true }).eq("status", "Menunggu"),
  ]);

  const invoices = invoicesRes.data ?? [];
  const totalLunas = invoices.filter((i) => i.status === "Lunas").reduce((sum, i) => sum + (i.total ?? 0), 0);
  const totalPiutang = invoices
    .filter((i) => i.status !== "Lunas")
    .reduce((sum, i) => sum + (i.total ?? 0), 0);
  const pendingCount = pendingRes.count ?? 0;

  return (
    <div>
      <div className="animate-fade-up mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-500 dark:text-emerald-400">
          Investor · Read Only
        </p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          {firstName ? `Ringkasan untuk ${firstName}` : "Ringkasan Investor"}
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          Hasil dari masing-masing divisi, Owner, Finance, dan Admin — semua di sini cuma untuk dilihat.
        </p>
      </div>

      {pendingCount > 0 && (
        <a
          href="/dashboard/investor/pengajuan-modal"
          className="mb-6 flex animate-fade-up items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-amber-500/20 dark:bg-amber-500/10"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white">
            <HandCoins className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
              {pendingCount} pengajuan modal menunggu keputusan Anda
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-300/70">Klik untuk Approve/Reject sekarang.</p>
          </div>
        </a>
      )}

      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        Magnarent
      </p>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickStatCard
          label="Booking Aktif"
          value={magnarentSummary.bookingAktif}
          hint="Menunggu & dikonfirmasi"
          icon={<CalendarRange className="h-5 w-5" />}
          accent="#3B82F6"
          href="/dashboard/investor"
        />
        <QuickStatCard
          label="Booking Bulan Ini"
          value={magnarentSummary.bookingBulanIni}
          hint="Sejak tanggal 1 bulan ini"
          icon={<ClipboardList className="h-5 w-5" />}
          accent="#06B6D4"
          href="/dashboard/investor"
          delayMs={40}
        />
      </div>

      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Magnativ</p>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickStatCard
          label="Proyek Berjalan"
          value={magnativeSummary.proyekBerjalan}
          hint="Status: Berjalan"
          icon={<Hammer className="h-5 w-5" />}
          accent="#8B5CF6"
          href="/dashboard/investor"
        />
        <QuickStatCard
          label="Konten 7 Hari Ke Depan"
          value={magnativeSummary.kontenMingguIni}
          hint="Terjadwal tayang minggu ini"
          icon={<CalendarPlus className="h-5 w-5" />}
          accent="#EC4899"
          href="/dashboard/investor"
          delayMs={40}
        />
      </div>

      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Production</p>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickStatCard
          label="Proyek Booth Aktif"
          value={productionSummary.proyekAktif}
          hint="Desain sampai Instalasi"
          icon={<PackageSearch className="h-5 w-5" />}
          accent="#F59E0B"
          href="/dashboard/investor"
        />
        <QuickStatCard
          label="Stok Menipis"
          value={productionSummary.stokMenipis}
          hint="Di titik minimum atau di bawahnya"
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="#EF4444"
          href="/dashboard/investor"
          warn={productionSummary.stokMenipis > 0}
          delayMs={40}
        />
      </div>

      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        Owner / Finance / Admin
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="animate-fade-up flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: "#10B981" }}>
            <Wallet2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold leading-tight text-zinc-900 dark:text-white">
              {formatRupiah(totalLunas)}
            </p>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Pendapatan Lunas</p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Total invoice berstatus Lunas</p>
          </div>
        </div>
        <div className="animate-fade-up flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: "#F59E0B" }}>
            <Receipt className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold leading-tight text-zinc-900 dark:text-white">
              {formatRupiah(totalPiutang)}
            </p>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Piutang Berjalan</p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Invoice Draft & Terkirim</p>
          </div>
        </div>
      </div>
    </div>
  );
}
