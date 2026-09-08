import type { ReactNode } from "react";
import { SubNav } from "@/components/layout/SubNav";
import { MODULES } from "@/lib/navigation";
import { MagnarentDataProvider } from "@/components/magnarent/MagnarentDataProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { createClient } from "@/lib/supabase/server";
import { rowToBooking, rowToInventory, type BookingRow, type InventoryRow } from "@/lib/magnarent/mappers";

const mod = MODULES.find((m) => m.id === "magnarent")!;

/**
 * Layout modul Magnarent — Server Component ini yang mengambil data
 * inventaris & booking dari Supabase (bukan lagi mock data statis di
 * memori) dan meneruskannya sebagai props ke `MagnarentDataProvider`.
 * Karena Next.js tidak me-remount layout saat berpindah antar sub-rute
 * (Ringkasan/Inventaris/Kalender/Booking), data ini tetap tersedia selama
 * pengguna berada di dalam modul; begitu ada mutasi (lewat Server Action di
 * `src/lib/magnarent/actions.ts`), `revalidatePath` membuat layout ini
 * dijalankan ulang otomatis dan provider menerima data terbaru.
 *
 * RLS (migrasi 0004) sudah membatasi baris yang kebaca cuma milik divisi
 * Magnarent/akses penuh — middleware juga sudah menolak staf divisi lain
 * sebelum sampai ke sini, jadi query di bawah tidak perlu filter divisi lagi.
 */
export default async function MagnarentLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const [inventoryResult, bookingsResult] = await Promise.all([
    supabase
      .from("magnarent_inventory")
      .select("*")
      .order("created_at", { ascending: true })
      .returns<InventoryRow[]>(),
    supabase
      .from("magnarent_bookings")
      .select("*")
      .order("tanggal_mulai", { ascending: true })
      .returns<BookingRow[]>(),
  ]);

  if (inventoryResult.error) {
    console.error("[magnarent] Gagal memuat inventaris:", inventoryResult.error.message);
  }
  if (bookingsResult.error) {
    console.error("[magnarent] Gagal memuat booking:", bookingsResult.error.message);
  }

  const inventory = (inventoryResult.data ?? []).map(rowToInventory);
  const bookings = (bookingsResult.data ?? []).map(rowToBooking);

  return (
    <ToastProvider>
      <MagnarentDataProvider inventory={inventory} bookings={bookings}>
        <div>
          <SubNav items={mod.subnav} gradient={mod.gradient} />
          <div className="p-4 md:p-8">{children}</div>
        </div>
      </MagnarentDataProvider>
    </ToastProvider>
  );
}
