import { createClient } from "@/lib/supabase/server";
import { ACTIVE_BOOTH_STATUSES } from "@/lib/production/availability";
import { todayISO } from "@/lib/shared/utils";

/**
 * Angka ringkasan untuk Dashboard Hub (`src/app/dashboard/page.tsx`).
 * Sengaja pakai client Supabase biasa (bukan admin/service-role) — RLS
 * per modul (migrasi 0004-0006) sudah otomatis membatasi baris yang
 * terhitung cuma milik divisi staf yang login (atau semua, untuk akun
 * akses penuh), jadi tidak perlu filter divisi manual di sini. Kalau
 * dipanggil oleh staf yang tidak punya akses ke modul terkait, hasilnya
 * otomatis 0 (bukan error) — pemanggil tetap harus mengecek visibilitas
 * modul dulu (lihat getVisibleModules) supaya kartu yang tidak relevan
 * tidak ditampilkan sama sekali.
 */

export type MagnarentSummary = { bookingAktif: number; bookingBulanIni: number };

export async function getMagnarentSummary(): Promise<MagnarentSummary> {
  const supabase = await createClient();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [aktif, bulanIni] = await Promise.all([
    supabase
      .from("magnarent_bookings")
      .select("id", { count: "exact", head: true })
      .in("status", ["Menunggu", "Dikonfirmasi"]),
    supabase
      .from("magnarent_bookings")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString()),
  ]);

  return {
    bookingAktif: aktif.count ?? 0,
    bookingBulanIni: bulanIni.count ?? 0,
  };
}

export type MagnativeSummary = { proyekBerjalan: number; kontenMingguIni: number };

export async function getMagnativeSummary(): Promise<MagnativeSummary> {
  const supabase = await createClient();
  const today = todayISO();
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [berjalan, konten] = await Promise.all([
    supabase.from("magnative_projects").select("id", { count: "exact", head: true }).eq("status", "Berjalan"),
    supabase
      .from("magnative_content_posts")
      .select("id", { count: "exact", head: true })
      .gte("tanggal_posting", today)
      .lte("tanggal_posting", in7Days),
  ]);

  return {
    proyekBerjalan: berjalan.count ?? 0,
    kontenMingguIni: konten.count ?? 0,
  };
}

export type ProductionSummary = { proyekAktif: number; stokMenipis: number };

export async function getProductionSummary(): Promise<ProductionSummary> {
  const supabase = await createClient();

  const [aktif, materials] = await Promise.all([
    supabase
      .from("production_booth_projects")
      .select("id", { count: "exact", head: true })
      .in("status", ACTIVE_BOOTH_STATUSES),
    supabase.from("production_materials").select("stock, min_stock"),
  ]);

  // Perbandingan dua kolom (stock <= min_stock) tidak didukung langsung
  // lewat filter PostgREST biasa, jadi dihitung di JS — tabel material
  // biasanya kecil (puluhan baris), jadi ini tetap murah.
  const stokMenipis = (materials.data ?? []).filter(
    (m: { stock: number; min_stock: number }) => m.stock <= m.min_stock
  ).length;

  return {
    proyekAktif: aktif.count ?? 0,
    stokMenipis,
  };
}
