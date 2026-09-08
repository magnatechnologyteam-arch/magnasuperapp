import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Division } from "@/lib/supabase/types";

export type NotifyPayload = { title: string; body: string; url?: string };

/**
 * Konfigurasi VAPID sekali per pemanggilan — dipakai bersama oleh
 * `sendTestPush` (src/lib/push/actions.ts) dan `notifyDivision` di sini,
 * supaya tidak ada dua salinan logika VAPID yang bisa saling berbeda.
 */
export function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY belum diset di .env.local");
  }

  webpush.setVapidDetails("mailto:magnatechnology.team@gmail.com", publicKey, privateKey);
}

/**
 * Kirim push notification ke semua staf satu (atau lebih) divisi TERTENTU,
 * PLUS akun akses penuh ('all') — supaya Owner/Finance/Investor otomatis
 * kebagian info dari semua divisi tanpa perlu didaftarkan manual di setiap
 * pemanggilan. Dipanggil dari Server Action modul terkait (mis. `addBooking`
 * di magnarent/actions.ts) tepat setelah sebuah kejadian bisnis nyata
 * berhasil tersimpan — modul ini sendiri tidak tahu/peduli soal kejadian
 * apa itu, cuma bertanggung jawab mengirim.
 *
 * Sengaja tidak pernah melempar error ke pemanggil: gagal kirim notifikasi
 * (VAPID belum diset, semua subscription kedaluwarsa, dsb.) tidak boleh
 * sampai membatalkan aksi bisnis yang sudah berhasil (booking/proyek/dll
 * sudah kepalang tersimpan) — cukup dicatat di log server.
 *
 * Pakai service role (`createAdminClient`) karena perlu baca `profiles` dan
 * `push_subscriptions` LINTAS PENGGUNA — RLS `push_subscriptions` sengaja
 * membatasi tiap orang cuma lihat baris miliknya sendiri (lihat migrasi
 * 0002), jadi ini satu-satunya tempat yang boleh melewati batasan itu,
 * karena tujuannya memang mengirim ke ORANG LAIN, bukan membocorkan data
 * ke browser.
 */
export async function notifyDivision(
  divisions: Division | Division[],
  payload: NotifyPayload,
  excludeUserId?: string
): Promise<void> {
  try {
    configureWebPush();
  } catch (err) {
    console.error("[push] Konfigurasi VAPID gagal, notifikasi dilewati:", err instanceof Error ? err.message : err);
    return;
  }

  const targets = Array.from(new Set([...(Array.isArray(divisions) ? divisions : [divisions]), "all"]));
  const admin = createAdminClient();

  const { data: profiles, error: profilesError } = await admin.from("profiles").select("id").in("division", targets);
  if (profilesError) {
    console.error("[push] Ambil daftar penerima gagal:", profilesError.message);
    return;
  }

  const userIds = (profiles ?? []).map((p) => p.id as string).filter((id) => id !== excludeUserId);
  if (userIds.length === 0) return;

  const { data: subscriptions, error: subsError } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key")
    .in("user_id", userIds);

  if (subsError) {
    console.error("[push] Ambil daftar subscription gagal:", subsError.message);
    return;
  }
  if (!subscriptions || subscriptions.length === 0) return;

  const body = JSON.stringify(payload);
  const expiredIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          body
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number } | null)?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(sub.id as string);
        } else {
          console.error("[push] Gagal kirim ke satu subscription:", err instanceof Error ? err.message : err);
        }
      }
    })
  );

  if (expiredIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", expiredIds);
  }
}
