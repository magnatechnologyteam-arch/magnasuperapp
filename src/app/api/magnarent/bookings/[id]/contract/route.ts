import { NextResponse, type NextRequest } from "next/server";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { rowToBooking, rowToInventory, type BookingRow, type InventoryRow } from "@/lib/magnarent/mappers";
import { rowToBookingDeposit, type BookingDepositRow } from "@/lib/magnarent/extras-types";
import { renderBookingContractPdf } from "@/lib/magnarent/contract-pdf";

// @react-pdf/renderer butuh Node.js APIs (Buffer, dsb) — bukan Edge Runtime,
// pola sama persis dengan /api/invoices/[id]/pdf.
export const runtime = "nodejs";

/**
 * GET /api/magnarent/bookings/:id/contract — Surat Perjanjian Sewa Alat
 * (Tahap 45 — gap #4 analisis-gap-magnarent.md), tombol "Ekspor Kontrak
 * Sewa" di BookingScheduler.tsx. PDF di-generate on-demand dari data
 * booking + alat + jaminan yang sudah ada, tidak disimpan ke Storage.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || (profile.division !== "magnarent" && profile.division !== "all")) {
    return NextResponse.json({ error: "Tidak punya akses." }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: bookingRow, error: bookingError } = await supabase
    .from("magnarent_bookings")
    .select("*")
    .eq("id", id)
    .returns<BookingRow[]>()
    .single();

  if (bookingError || !bookingRow) {
    return NextResponse.json({ error: "Booking tidak ditemukan." }, { status: 404 });
  }

  const booking = rowToBooking(bookingRow);

  const [{ data: itemRow }, { data: depositRow }] = await Promise.all([
    booking.itemId
      ? supabase.from("magnarent_inventory").select("*").eq("id", booking.itemId).returns<InventoryRow[]>().maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("magnarent_booking_deposits")
      .select("*")
      .eq("booking_id", id)
      .returns<BookingDepositRow[]>()
      .maybeSingle(),
  ]);

  const item = itemRow ? rowToInventory(itemRow) : undefined;
  const deposit = depositRow ? rowToBookingDeposit(depositRow) : null;

  const pdfBuffer = await renderBookingContractPdf(booking, item, deposit);
  const fileName = `Kontrak-Sewa-${booking.namaKlien.replace(/[^a-z0-9]+/gi, "-")}-${id.slice(0, 8)}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
