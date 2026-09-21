"use client";

import { BellOff, BellRing, Loader2 } from "lucide-react";
import { usePushSubscription } from "@/components/push/usePushSubscription";
import { useT } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/cn";

/**
 * Update Opsional 1 (item 2) — sebelumnya "Aktifkan/Matikan Notifikasi" +
 * tombol "Kirim Notifikasi Tes" ada di lonceng terpisah di Topbar
 * (`PushNotificationBell`, sekarang dihapus). Owner minta disatukan ke
 * Pengaturan sebagai SATU toggle sederhana (Nyalakan Notifikasi/tidak),
 * tombol tes dihapus sama sekali — kotak masuk notifikasi in-app yang baru
 * (`NotificationInbox`, di sebelah Pencarian Global) sudah cukup untuk
 * memastikan notifikasi benar-benar sampai, jadi tombol tes terpisah
 * tidak lagi diperlukan di sini.
 *
 * Logika aktifkan/matikan-nya TETAP dari `usePushSubscription` yang sama
 * dipakai `InvestorPushBanner` — cuma UI-nya yang beda, satu sumber
 * kebenaran untuk alur subscribe Web Push di seluruh aplikasi tetap terjaga.
 */
export function PushToggleSettingsForm() {
  const t = useT();
  const { status, isBusy, feedback, enable, disable } = usePushSubscription();

  if (status === "unsupported") return null;

  const isOn = status === "on";

  return (
    <div className="h-fit rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <h2 className="text-sm font-bold text-zinc-900 dark:text-white">{t("Notifikasi")}</h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {status === "denied"
          ? t("Izin browser ditolak — aktifkan lewat pengaturan situs, lalu muat ulang halaman ini.")
          : t("Dapatkan notifikasi push di perangkat ini untuk kejadian penting, walau browser sedang ditutup.")}
      </p>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-black/5 px-3.5 py-3 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          {isOn ? (
            <BellRing className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
          ) : (
            <BellOff className="h-4.5 w-4.5 text-zinc-400" />
          )}
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            {isOn ? t("Notifikasi Aktif") : t("Notifikasi Nonaktif")}
          </span>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isOn}
          aria-label={t("Nyalakan Notifikasi")}
          disabled={isBusy || status === "denied"}
          onClick={() => (isOn ? disable() : enable())}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            isOn ? "bg-indigo-600" : "bg-zinc-200 dark:bg-white/10"
          )}
        >
          {isBusy ? (
            <Loader2 className="absolute inset-0 m-auto h-3.5 w-3.5 animate-spin text-white" />
          ) : (
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                isOn ? "translate-x-[1.375rem]" : "translate-x-0.5"
              )}
            />
          )}
        </button>
      </div>

      {feedback && <p className="mt-2.5 px-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">{feedback}</p>}
    </div>
  );
}
