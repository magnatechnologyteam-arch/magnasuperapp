import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyDivision } from "@/lib/push/notify";
import { formatRupiah } from "@/lib/shared/utils";
import { rowToCapitalRequest, type CapitalRequestRow } from "@/lib/capital-requests/mappers";

export const runtime = "nodejs";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Tahap 28d: "ringkasan otomatis berkala (push)" untuk investor — pola sama
 * persis dengan `/api/cron/invoice-reminders` (dipanggil Vercel Cron sesuai
 * `vercel.json`, dilindungi `CRON_SECRET`, pakai service role karena
 * dipanggil sistem bukan staf yang login). Bedanya di sini bukan pengingat
 * per-baris yang jatuh tempo, melainkan SATU ringkasan mingguan: berapa
 * pengajuan modal yang masih menunggu keputusan investor sekarang, plus apa
 * saja yang sudah diputuskan 7 hari terakhir (supaya investor yang jarang
 * buka app tetap dapat gambaran tanpa harus buka satu-satu).
 *
 * Sengaja TIDAK mengirim apa-apa kalau tidak ada yang menunggu DAN tidak ada
 * keputusan baru minggu ini — notifikasi kosong cuma bikin investor terbiasa
 * mengabaikan push dari app ini (sama alasannya dengan `computeDueReminders`
 * yang cuma mengembalikan baris yang benar-benar perlu diingatkan).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("capital_requests")
    .select("*")
    .returns<CapitalRequestRow[]>();

  if (error) {
    console.error("[cron] investor-capital-summary: ambil data gagal:", error.message);
    return NextResponse.json({ error: "Gagal ambil data pengajuan modal" }, { status: 500 });
  }

  const requests = (rows ?? []).map(rowToCapitalRequest);
  const pending = requests.filter((r) => r.status === "Menunggu");

  const cutoff = Date.now() - SEVEN_DAYS_MS;
  const decidedThisWeek = requests.filter((r) => r.decidedAt && new Date(r.decidedAt).getTime() >= cutoff);
  const disetujuiThisWeek = decidedThisWeek.filter((r) => r.status === "Disetujui");
  const ditolakThisWeek = decidedThisWeek.filter((r) => r.status === "Ditolak");
  const totalModalDisetujuiThisWeek = disetujuiThisWeek.reduce((sum, r) => sum + r.modalEstimate, 0);

  if (pending.length === 0 && decidedThisWeek.length === 0) {
    return NextResponse.json({ ok: true, sent: false, reason: "Tidak ada yang perlu dilaporkan minggu ini." });
  }

  const parts: string[] = [];
  if (pending.length > 0) {
    parts.push(`${pending.length} pengajuan menunggu keputusan Anda`);
  }
  if (disetujuiThisWeek.length > 0) {
    parts.push(`${disetujuiThisWeek.length} disetujui (${formatRupiah(totalModalDisetujuiThisWeek)}) 7 hari terakhir`);
  }
  if (ditolakThisWeek.length > 0) {
    parts.push(`${ditolakThisWeek.length} ditolak 7 hari terakhir`);
  }

  await notifyDivision(["investor"], {
    title: "Ringkasan Pengajuan Modal Mingguan",
    body: parts.join(" · "),
    url: "/dashboard/investor/pengajuan-modal",
  });

  return NextResponse.json({
    ok: true,
    sent: true,
    pending: pending.length,
    disetujuiThisWeek: disetujuiThisWeek.length,
    ditolakThisWeek: ditolakThisWeek.length,
  });
}
