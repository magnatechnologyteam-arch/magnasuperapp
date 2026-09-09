import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyDivision } from "@/lib/push/notify";
import { rowToInvoice, type InvoiceRow } from "@/lib/invoices/mappers";
import { computeDueReminders, reminderBody, reminderTitle } from "@/lib/invoices/reminders";

export const runtime = "nodejs";

/**
 * Tahap 2 dari roadmap peningkatan MagnaSuperApp: pengingat jatuh tempo
 * invoice OTOMATIS — tapi sengaja lewat NOTIFIKASI IN-APP (push ke akun
 * akses penuh/Finance) dulu, BUKAN WhatsApp otomatis, karena bagian WhatsApp
 * (lewat webhook n8n di `src/lib/invoices/whatsapp.ts`) masih sengaja
 * ditunda sampai tim paham betul cara kerja n8n-nya. Begitu siap, tinggal
 * tambah pemanggilan `triggerInvoiceWhatsAppWebhook` di loop bawah tanpa
 * mengubah logika threshold di `computeDueReminders`.
 *
 * Dipanggil otomatis oleh Vercel Cron sesuai jadwal di `vercel.json`
 * (sekali sehari, pagi WIB). Vercel otomatis menyertakan header
 * `Authorization: Bearer ${CRON_SECRET}` di setiap panggilan cron-nya
 * sendiri — endpoint ini menolak permintaan mana pun yang headernya tidak
 * cocok persis, supaya tidak bisa dipicu sembarang orang dari luar kalau
 * URL-nya ketahuan (endpoint ini publik, tidak dilindungi login staf).
 *
 * Pakai service role (`createAdminClient`) karena endpoint ini dipanggil
 * SISTEM, bukan staf yang login — tidak ada sesi/cookie untuk lewat RLS
 * biasa, sama seperti alasan `notifyDivision` di src/lib/push/notify.ts.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("invoices")
    .select("*")
    .neq("status", "Lunas")
    .not("due_date", "is", null)
    .returns<InvoiceRow[]>();

  if (error) {
    console.error("[cron] invoice-reminders: ambil data invoice gagal:", error.message);
    return NextResponse.json({ error: "Gagal ambil data invoice" }, { status: 500 });
  }

  const invoices = (rows ?? []).map(rowToInvoice);
  const reminders = computeDueReminders(invoices);

  // Dikirim satu per satu (bukan Promise.all) supaya kalau satu gagal kirim
  // (mis. VAPID belum diset), yang lain tetap lanjut diproses — `notifyDivision`
  // sendiri sudah tidak pernah melempar error ke pemanggil.
  for (const reminder of reminders) {
    await notifyDivision("all", {
      title: reminderTitle(reminder.kind),
      body: reminderBody(reminder),
      url: "/dashboard/admin/faktur",
    });
  }

  return NextResponse.json({ ok: true, checked: invoices.length, reminded: reminders.length });
}
