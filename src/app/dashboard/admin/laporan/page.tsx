import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { DonutChart } from "@/components/ui/DonutChart";
import { LaporanStatGrid } from "./LaporanStatGrid";
import { rowToBooking, rowToInventory, type BookingRow, type InventoryRow } from "@/lib/magnarent/mappers";
import { calculateBookingTotal } from "@/lib/magnarent/pricing";
import { rowToProject, type ProjectRow } from "@/lib/magnative/mappers";
import { rowToBoothProject, rowToMaterial, type BoothProjectRow, type MaterialRow } from "@/lib/production/mappers";
import { ACTIVE_BOOTH_STATUSES } from "@/lib/production/availability";

const DIVISION_LABEL: Record<string, string> = {
  magnarent: "Magnarent",
  magnative: "Magnativ",
  production: "Production",
};

function countByStatus<T extends { status: string }>(rows: T[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});
}

/**
 * Laporan — awalnya HANYA untuk akun akses penuh (division "all":
 * Owner/Finance/Investor), sama seperti "Kelola Pengguna". Menggabungkan
 * angka dari ketiga modul jadi satu halaman, supaya tidak perlu buka
 * Ringkasan Magnarent/Magnative/Production satu-satu untuk lihat gambaran
 * besar.
 *
 * Tahap 35: dibuka juga ke 3 divisi operasional, TAPI setiap divisi cuma
 * lihat kartu & donut chart miliknya SENDIRI — bukan versi lintas-divisi di
 * atas (itu tetap eksklusif akses penuh, sama alasannya dengan kenapa
 * "Klien Terpadu"/"Piutang & Pendapatan" tidak ikut dibuka: menggabungkan
 * angka Magnarent+Magnative+Production dalam satu halaman berarti staf satu
 * divisi jadi bisa lihat data finansial divisi lain). Semua query di sini
 * tetap pakai client Supabase biasa (respect RLS `can_access_division`,
 * BUKAN admin/service-role) — jadi biarpun ada salah kode di bawah, staf
 * Magnarent tidak akan pernah benar-benar bisa menarik baris dari tabel
 * Magnative/Production, RLS jadi lapis pertahanan terakhir yang sudah ada
 * dari awal.
 */
export default async function LaporanPage() {
  const profile = await getCurrentProfile();
  const isFullAccess = profile?.division === "all";
  const isOperationalDivision =
    profile?.division === "magnarent" || profile?.division === "magnative" || profile?.division === "production";
  if (!profile || (!isFullAccess && !isOperationalDivision)) {
    redirect("/dashboard");
  }

  const scope: "all" | "magnarent" | "magnative" | "production" = isFullAccess
    ? "all"
    : (profile.division as "magnarent" | "magnative" | "production");
  const supabase = await createClient();

  const wantMagnarent = scope === "all" || scope === "magnarent";
  const wantMagnative = scope === "all" || scope === "magnative";
  const wantProduction = scope === "all" || scope === "production";

  const [inventoryRes, bookingsRes, projectsRes, boothProjectsRes, materialsRes] = await Promise.all([
    wantMagnarent
      ? supabase.from("magnarent_inventory").select("*").returns<InventoryRow[]>()
      : Promise.resolve({ data: [] as InventoryRow[] }),
    wantMagnarent
      ? supabase.from("magnarent_bookings").select("*").returns<BookingRow[]>()
      : Promise.resolve({ data: [] as BookingRow[] }),
    wantMagnative
      ? supabase.from("magnative_projects").select("*").returns<ProjectRow[]>()
      : Promise.resolve({ data: [] as ProjectRow[] }),
    wantProduction
      ? supabase.from("production_booth_projects").select("*").returns<BoothProjectRow[]>()
      : Promise.resolve({ data: [] as BoothProjectRow[] }),
    wantProduction
      ? supabase.from("production_materials").select("*").returns<MaterialRow[]>()
      : Promise.resolve({ data: [] as MaterialRow[] }),
  ]);

  const inventory = (inventoryRes.data ?? []).map(rowToInventory);
  const bookings = (bookingsRes.data ?? []).map(rowToBooking);
  const projects = (projectsRes.data ?? []).map(rowToProject);
  const boothProjects = (boothProjectsRes.data ?? []).map(rowToBoothProject);
  const materials = (materialsRes.data ?? []).map(rowToMaterial);

  const nilaiTerkonfirmasi = bookings
    .filter((b) => b.status === "Dikonfirmasi")
    .reduce((sum, b) => sum + calculateBookingTotal(b, inventory.find((i) => i.id === b.itemId)), 0);
  const nilaiMenunggu = bookings
    .filter((b) => b.status === "Menunggu")
    .reduce((sum, b) => sum + calculateBookingTotal(b, inventory.find((i) => i.id === b.itemId)), 0);
  const bookingStatusCounts = countByStatus(bookings);

  const budgetProyekAktif = projects
    .filter((p) => p.status === "Perencanaan" || p.status === "Berjalan")
    .reduce((sum, p) => sum + p.budget, 0);
  const projectStatusCounts = countByStatus(projects);

  const budgetBoothAktif = boothProjects
    .filter((p) => ACTIVE_BOOTH_STATUSES.includes(p.status))
    .reduce((sum, p) => sum + p.budget, 0);
  const nilaiStokGudang = materials.reduce((sum, m) => sum + m.stock * m.pricePerUnit, 0);
  const boothStatusCounts = countByStatus(boothProjects);

  const totalPotensi = nilaiTerkonfirmasi + nilaiMenunggu + budgetProyekAktif + budgetBoothAktif;

  const title = scope === "all" ? "Laporan Lintas Divisi" : `Laporan ${DIVISION_LABEL[scope]}`;
  const description =
    scope === "all"
      ? "Gambaran Magnarent, Magnativ & Production dalam satu halaman."
      : `Gambaran performa ${DIVISION_LABEL[scope]} — cuma bisa dilihat, bukan diedit.`;

  return (
    <div className="p-4 md:p-8">
      <div className="animate-fade-up flex items-start gap-4">
        <div className="relative shrink-0">
          <span
            className="absolute -inset-1.5 animate-pulse rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 opacity-30 blur-lg"
            aria-hidden
          />
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-sm">
            <BarChart3 className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-500 dark:text-indigo-400">
            {scope === "all" ? "Admin" : DIVISION_LABEL[scope]}
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">{title}</h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
      </div>

      <div className="mt-6">
        <LaporanStatGrid
          scope={scope}
          nilaiTerkonfirmasi={wantMagnarent ? nilaiTerkonfirmasi : undefined}
          nilaiMenunggu={wantMagnarent ? nilaiMenunggu : undefined}
          budgetProyekAktif={wantMagnative ? budgetProyekAktif : undefined}
          budgetBoothAktif={wantProduction ? budgetBoothAktif : undefined}
          nilaiStokGudang={wantProduction ? nilaiStokGudang : undefined}
          totalPotensi={scope === "all" ? totalPotensi : undefined}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {wantMagnarent && (
          <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <div className="border-b border-black/5 px-5 py-3.5 dark:border-white/10">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Status Booking Magnarent</h3>
            </div>
            <div className="px-5 py-5">
              <DonutChart
                data={[
                  { label: "Menunggu", value: bookingStatusCounts.Menunggu ?? 0, color: "#f59e0b" },
                  { label: "Dikonfirmasi", value: bookingStatusCounts.Dikonfirmasi ?? 0, color: "#10b981" },
                  { label: "Selesai", value: bookingStatusCounts.Selesai ?? 0, color: "#71717a" },
                  { label: "Dibatalkan", value: bookingStatusCounts.Dibatalkan ?? 0, color: "#f43f5e" },
                ]}
              />
            </div>
          </div>
        )}

        {wantMagnative && (
          <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <div className="border-b border-black/5 px-5 py-3.5 dark:border-white/10">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Status Proyek Magnativ</h3>
            </div>
            <div className="px-5 py-5">
              <DonutChart
                data={[
                  { label: "Pitching", value: projectStatusCounts.Pitching ?? 0, color: "#8b5cf6" },
                  { label: "Perencanaan", value: projectStatusCounts.Perencanaan ?? 0, color: "#0ea5e9" },
                  { label: "Berjalan", value: projectStatusCounts.Berjalan ?? 0, color: "#f59e0b" },
                  { label: "Selesai", value: projectStatusCounts.Selesai ?? 0, color: "#71717a" },
                  { label: "Dibatalkan", value: projectStatusCounts.Dibatalkan ?? 0, color: "#f43f5e" },
                ]}
              />
            </div>
          </div>
        )}

        {wantProduction && (
          <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <div className="border-b border-black/5 px-5 py-3.5 dark:border-white/10">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Tahap Proyek Booth Production</h3>
            </div>
            <div className="px-5 py-5">
              <DonutChart
                data={[
                  { label: "Desain", value: boothStatusCounts.Desain ?? 0, color: "#0ea5e9" },
                  { label: "Produksi", value: boothStatusCounts.Produksi ?? 0, color: "#f59e0b" },
                  { label: "Finishing", value: boothStatusCounts.Finishing ?? 0, color: "#8b5cf6" },
                  { label: "Instalasi", value: boothStatusCounts.Instalasi ?? 0, color: "#06b6d4" },
                  { label: "Selesai", value: boothStatusCounts.Selesai ?? 0, color: "#10b981" },
                  { label: "Dibatalkan", value: boothStatusCounts.Dibatalkan ?? 0, color: "#f43f5e" },
                ]}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
