"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, BellRing, Loader2, Send } from "lucide-react";
import { usePushSubscription } from "./usePushSubscription";
import { cn } from "@/lib/cn";

/**
 * Lonceng notifikasi di Topbar — fondasi Web Push asli (bukan mock).
 * Alurnya: minta izin browser → daftar Service Worker (`/sw.js`) → subscribe
 * ke PushManager pakai VAPID public key → simpan subscription ke tabel
 * `push_subscriptions` Supabase lewat Server Action. Logikanya sendiri ada
 * di `usePushSubscription` (dipakai ulang juga oleh `InvestorPushBanner`).
 */
export function PushNotificationBell() {
  const [open, setOpen] = useState(false);
  const { status, isBusy, feedback, enable, disable, test } = usePushSubscription();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (status === "unsupported") return null;

  const Icon = status === "on" ? BellRing : status === "denied" ? BellOff : Bell;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "grid h-9 w-9 place-items-center rounded-full border border-black/5 bg-white text-zinc-500 shadow-sm transition-colors hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5",
          status === "on" && "text-indigo-600 dark:text-indigo-400"
        )}
        aria-label="Notifikasi"
      >
        <Icon className="h-4 w-4" />
      </button>

      {open && (
        <div className="animate-fade-in absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-xl shadow-black/10 dark:border-white/10 dark:bg-zinc-900">
          <div className="border-b border-black/5 px-4 py-3 dark:border-white/10">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Notifikasi Push</p>
            <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
              {status === "on"
                ? "Aktif di perangkat ini."
                : status === "denied"
                  ? "Izin browser ditolak — aktifkan lewat pengaturan situs."
                  : "Belum aktif di perangkat ini."}
            </p>
          </div>

          <div className="space-y-2 p-3">
            {status !== "denied" && (
              <button
                type="button"
                onClick={status === "on" ? disable : enable}
                disabled={isBusy}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  status === "on"
                    ? "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300"
                    : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300"
                )}
              >
                {isBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : status === "on" ? (
                  <BellOff className="h-4 w-4" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                {status === "on" ? "Matikan Notifikasi" : "Aktifkan Notifikasi"}
              </button>
            )}

            {status === "on" && (
              <button
                type="button"
                onClick={test}
                disabled={isBusy}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 px-3.5 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
              >
                <Send className="h-3.5 w-3.5" />
                Kirim Notifikasi Tes
              </button>
            )}

            {feedback && <p className="px-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">{feedback}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
