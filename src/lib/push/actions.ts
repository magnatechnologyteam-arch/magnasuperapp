"use server";

import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { configureWebPush } from "./notify";

export type SubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

/** Konsisten dengan `GENERIC_ERROR` di modul lain (mis. capital-requests/actions.ts) —
 * pesan error Postgres mentah (mis. "duplicate key value violates unique
 * constraint...") tidak pernah ditampilkan langsung ke pengguna, cuma dicatat
 * ke server log lewat `console.error` untuk ditelusuri kalau perlu. */
const GENERIC_ERROR = "Terjadi kesalahan, coba lagi.";

/** Dipanggil dari klien setelah `pushManager.subscribe()` berhasil. */
export async function savePushSubscription(subscription: SubscriptionInput, userAgent: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Anda belum masuk." };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
      user_agent: userAgent,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("[push] savePushSubscription gagal:", error.message);
    return { ok: false, message: GENERIC_ERROR };
  }
  return { ok: true };
}

/** Dipanggil dari klien saat pengguna mematikan notifikasi di perangkat ini. */
export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Anda belum masuk." };

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);

  if (error) {
    console.error("[push] removePushSubscription gagal:", error.message);
    return { ok: false, message: GENERIC_ERROR };
  }
  return { ok: true };
}

/**
 * Kirim satu notifikasi tes ke semua perangkat milik pengguna yang sedang
 * login. Pemicu OTOMATIS dari kejadian bisnis nyata (booking baru,
 * stok menipis, proyek baru) sudah tersambung sejak data modul-modul
 * pindah ke Supabase — lihat `notifyDivision` di `./notify.ts`, dipanggil
 * dari Server Action masing-masing modul (magnarent/magnative/production).
 * Tombol "Kirim Notifikasi Tes" ini tetap berguna untuk memastikan jalur
 * pengiriman ke perangkat Anda sendiri masih hidup.
 */
export async function sendTestPush(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Anda belum masuk." };

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key")
    .eq("user_id", user.id);

  if (error) {
    console.error("[push] sendTestPush gagal ambil daftar subscription:", error.message);
    return { ok: false, message: GENERIC_ERROR };
  }
  if (!subscriptions || subscriptions.length === 0) {
    return { ok: false, message: "Belum ada perangkat yang mengaktifkan notifikasi." };
  }

  try {
    configureWebPush();
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Konfigurasi VAPID key gagal." };
  }

  const payload = JSON.stringify({
    title: "MagnaSuperApp",
    body: "Ini notifikasi tes — kalau ini muncul, fondasi push notification sudah berfungsi.",
    url: "/dashboard",
  });

  const expiredIds: string[] = [];
  let successCount = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload
        );
        successCount += 1;
      } catch (err) {
        const statusCode = (err as { statusCode?: number } | null)?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(sub.id);
        }
      }
    })
  );

  if (expiredIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", expiredIds);
  }

  if (successCount === 0) {
    return { ok: false, message: "Gagal mengirim — kemungkinan semua langganan sudah kedaluwarsa." };
  }

  return { ok: true, message: `Notifikasi tes terkirim ke ${successCount} perangkat.` };
}
