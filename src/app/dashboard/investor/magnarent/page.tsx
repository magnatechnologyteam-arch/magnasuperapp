import { CalendarRange } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { rowToBooking, rowToInventory, type BookingRow, type InventoryRow } from "@/lib/magnarent/mappers";
import { calculateBookingTotal } from "@/lib/magnarent/pricing";
import { InvestorSectionHeader } from "@/components/investor/InvestorSectionHeader";
import { InvestorBookingTable } from "@/components/investor/InvestorBookingTable";

/**
 * Rincian Magnarent untuk investor — bukan cuma angka ringkasan seperti
 * sebelumnya, tapi daftar booking sungguhan (klien, alat, tanggal, total
 * biaya, status) supaya klik kartu di Ringkasan benar-benar menampilkan
 * "keterangan/hasil" (rancangan Owner), bukan cuma balik ke halaman yang
 * sama. Read only berkat policy SELECT investor di migrasi 0019 — tidak ada
 * tombol aksi apa pun di sini.
 */
export default async function InvestorMagnarentPage() {
  const supabase = await createClient();
  const [bookingsRes, inventoryRes] = await Promise.all([
    supabase
      .from("magnarent_bookings")
      .select("*")
      .order("tanggal_mulai", { ascending: false })
      .returns<BookingRow[]>(),
    supabase.from("magnarent_inventory").select("*").returns<InventoryRow[]>(),
  ]);

  const bookings = (bookingsRes.data ?? []).map(rowToBooking);
  const inventory = (inventoryRes.data ?? []).map(rowToInventory);
  const itemName = (itemId: string) => inventory.find((i) => i.id === itemId)?.name ?? "—";
  const rows = bookings.map((b) => ({
    booking: b,
    itemName: itemName(b.itemId),
    total: calculateBookingTotal(b, inventory.find((i) => i.id === b.itemId)),
  }));

  return (
    <div>
      <InvestorSectionHeader
        icon={CalendarRange}
        eyebrow="Investor"
        title="Magnarent — Booking"
        description={`${bookings.length} booking tercatat, terbaru di atas.`}
        accent="#3B82F6"
      />
      <InvestorBookingTable rows={rows} />
    </div>
  );
}
