"use client";

import { useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription, sendTestPush } from "@/lib/push/actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export type PushStatus = "checking" | "unsupported" | "denied" | "off" | "on";

/**
 * Logika Web Push (cek status, aktifkan, matikan, kirim tes) diekstrak dari
 * `PushNotificationBell` (lonceng di Topbar) supaya bisa dipakai ulang di
 * tempat lain — mis. `InvestorPushBanner` — TANPA menduplikasi kode
 * `urlBase64ToUint8Array`/alur subscribe yang gampang beda-beda kalau
 * ditulis dua kali. Satu-satunya sumber kebenaran untuk "aktifkan
 * notifikasi push" di seluruh aplikasi ada di sini.
 */
export function usePushSubscription() {
  const [status, setStatus] = useState<PushStatus>("checking");
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const existing = await registration.pushManager.getSubscription();
        setStatus(existing ? "on" : "off");
      } catch {
        setStatus("off");
      }
    }
    check();
  }, []);

  async function enable() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setFeedback("VAPID key belum diset — cek .env.local.");
      return;
    }

    setIsBusy(true);
    setFeedback(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        setFeedback("Izin notifikasi ditolak di browser.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setFeedback("Gagal membaca data subscription dari browser.");
        return;
      }

      const result = await savePushSubscription(
        { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
        navigator.userAgent
      );

      if (!result.ok) {
        setFeedback(result.message);
        return;
      }

      setStatus("on");
      setFeedback("Notifikasi diaktifkan di perangkat ini — akan tetap muncul walau browser ditutup.");
    } catch {
      setFeedback("Gagal mengaktifkan notifikasi.");
    } finally {
      setIsBusy(false);
    }
  }

  async function disable() {
    setIsBusy(true);
    setFeedback(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
      setFeedback("Notifikasi dimatikan di perangkat ini.");
    } catch {
      setFeedback("Gagal mematikan notifikasi.");
    } finally {
      setIsBusy(false);
    }
  }

  async function test() {
    setIsBusy(true);
    setFeedback(null);
    const result = await sendTestPush();
    setFeedback(result.message ?? null);
    setIsBusy(false);
  }

  return { status, isBusy, feedback, enable, disable, test };
}
