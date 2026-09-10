import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyDivision } from "@/lib/push/notify";
import { rowToBooking, rowToInventory, type BookingRow, type InventoryRow } from "@/lib/magnarent/mappers";
import { computeReturnReminders, returnReminderBody, returnReminderTitle } from "@/lib/magnarent/return-reminders";

export const runtime = "nodejs";

/**
 * Tahap 28a — pengingat H-1 sebelum alat harus kembali, pola SAMA PERSIS
 * dengan `/api/cron/invoice-reminders` (lihat komentar di sana untuk
 * penjelasan otentikasi CRON_SECRET & alasan pakai service role). Dipanggil
 * otomatis oleh Vercel Cron sesuai jadwal baru di `vercel.json`.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const [bookingsRes, inventoryRes] = await Promise.all([
    admin.from("magnarent_bookings").select("*").in("status", ["Menunggu", "Dikonfirmasi"]).returns<BookingRow[]>(),
    admin.from("magnarent_inventory").select("*").returns<InventoryRow[]>(),
  ]);

  if (bookingsRes.error) {
    console.error("[cron] booking-return-reminders: ambil data booking gagal:", bookingsRes.error.message);
    return NextResponse.json({ error: "Gagal ambil data booking" }, { status: 500 });
  }

  const bookings = (bookingsRes.data ?? []).map(rowToBooking);
  const inventory = (inventoryRes.data ?? []).map(rowToInventory);
  const itemName = (itemId: string) => inventory.find((i) => i.id === itemId)?.name ?? "alat";
  const reminders = computeReturnReminders(bookings);

  for (const reminder of reminders) {
    await notifyDivision("magnarent", {
      title: returnReminderTitle(reminder.kind),
      body: returnReminderBody(reminder, itemName(reminder.booking.itemId)),
      url: "/dashboard/magnarent/booking",
    });
  }

  return NextResponse.json({ ok: true, checked: bookings.length, reminded: reminders.length });
}
