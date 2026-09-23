"use server";

import { createClient } from "@/lib/supabase/server";
import type { AppNotification } from "./types";

const GENERIC_ERROR = "Terjadi kesalahan, coba lagi.";
const LIST_LIMIT = 30;

export type MutationResult = { ok: true } | { ok: false; error: string };

/**
 * Ambil notifikasi in-app milik pengguna yang sedang login (migrasi 0055).
 * Dua query terpisah (bukan satu join) supaya tetap lewat client Supabase
 * BIASA (bukan admin/service-role) — RLS `notifications` (lihat migrasi)
 * sudah otomatis membatasi baris ke divisi/akun pengguna ini sendiri,
 * persis pola `getMagnarentSummary` dkk di lib/dashboard/summary.ts.
 */
export async function listMyNotifications(): Promise<{ items: AppNotification[]; unreadCount: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], unreadCount: 0 };

  const { data: rows, error } = await supabase
    .from("notifications")
    .select("id, title, body, url, created_at, is_important")
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (error) {
    console.error("[notifications] listMyNotifications gagal:", error.message);
    return { items: [], unreadCount: 0 };
  }
  if (!rows || rows.length === 0) return { items: [], unreadCount: 0 };

  const { data: reads } = await supabase
    .from("notification_reads")
    .select("notification_id")
    .eq("user_id", user.id)
    .in(
      "notification_id",
      rows.map((r) => r.id)
    );

  const readIds = new Set((reads ?? []).map((r) => r.notification_id as string));

  const items: AppNotification[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    url: r.url,
    createdAt: r.created_at,
    isRead: readIds.has(r.id),
    isImportant: r.is_important,
  }));

  return { items, unreadCount: items.filter((n) => !n.isRead).length };
}

/**
 * Notifikasi "penting" (migrasi 0062) yang BELUM dibaca pengguna ini --
 * dipakai `ImportantNotificationBanner` di AppShell (poll ringan, sama
 * pola dengan `listMyNotifications`/`NotificationInbox`), TERPISAH dari
 * kotak masuk biasa supaya query-nya kecil (limit 10, cukup untuk antrean
 * banner) dan tidak menduplikasi seluruh daftar 30 notifikasi biasa.
 * RLS `notifications_read` yang sama tetap berlaku (staf cuma lihat baris
 * yang memang ditujukan ke divisi/dirinya) -- filter `is_important` di sini
 * murni soal tampilan, bukan akses data.
 */
export async function listUnreadImportantNotifications(): Promise<AppNotification[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows, error } = await supabase
    .from("notifications")
    .select("id, title, body, url, created_at, is_important")
    .eq("is_important", true)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[notifications] listUnreadImportantNotifications gagal:", error.message);
    return [];
  }
  if (!rows || rows.length === 0) return [];

  const { data: reads } = await supabase
    .from("notification_reads")
    .select("notification_id")
    .eq("user_id", user.id)
    .in(
      "notification_id",
      rows.map((r) => r.id)
    );
  const readIds = new Set((reads ?? []).map((r) => r.notification_id as string));

  return rows
    .filter((r) => !readIds.has(r.id))
    .map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      url: r.url,
      createdAt: r.created_at,
      isRead: false,
      isImportant: r.is_important,
    }));
}

/** Tandai satu notifikasi sudah dibaca oleh pengguna yang sedang login. */
export async function markNotificationRead(notificationId: string): Promise<MutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Anda belum masuk." };

  const { error } = await supabase
    .from("notification_reads")
    .upsert({ notification_id: notificationId, user_id: user.id }, { onConflict: "notification_id,user_id" });

  if (error) {
    console.error("[notifications] markNotificationRead gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  return { ok: true };
}

/** Tandai SEMUA notifikasi yang sedang tampil (di halaman ini) sudah dibaca sekaligus. */
export async function markAllNotificationsRead(notificationIds: string[]): Promise<MutationResult> {
  if (notificationIds.length === 0) return { ok: true };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Anda belum masuk." };

  const { error } = await supabase
    .from("notification_reads")
    .upsert(
      notificationIds.map((id) => ({ notification_id: id, user_id: user.id })),
      { onConflict: "notification_id,user_id" }
    );

  if (error) {
    console.error("[notifications] markAllNotificationsRead gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  return { ok: true };
}
