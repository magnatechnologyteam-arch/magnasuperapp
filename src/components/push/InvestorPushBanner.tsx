"use client";

import { BellRing, Loader2, Send } from "lucide-react";
import { usePushSubscription } from "./usePushSubscription";
import { cn } from "@/lib/cn";

/**
 * Banner besar (bukan cuma lonceng kecil di Topbar) khusus di halaman
 * Ringkasan Investor — supaya "aktifkan notifikasi" tidak tersembunyi dan
 * investor benar-benar mengaktifkannya. Begitu aktif, notifikasi push akan
 * tetap muncul di perangkat ini walau browser/tab ditutup (selama
 * perangkatnya menyala) — ini pakai jalur Web Push asli yang sama dengan
 * lonceng di Topbar (lihat `usePushSubscription`), bukan sekadar toast
 * dalam aplikasi yang cuma muncul kalau tab sedang dibuka.
 */
export function InvestorPushBanner() {
  const { status, isBusy, feedback, enable, test } = usePushSubscription();

  if (status === "unsupported" || status === "checking") return null;

  if (status === "on") {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
        <div className="flex items-center gap-2.5">
          <BellRing className="h-4.5 w-4.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            Notifikasi push aktif — Anda akan diberi tahu begitu ada pengajuan modal baru, walau browser ditutup.
          </p>
        </div>
        <button
          type="button"
          onClick={test}
          disabled={isBusy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
        >
          {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Tes Notifikasi
        </button>
        {feedback && <p className="w-full text-xs text-emerald-700/80 dark:text-emerald-300/70">{feedback}</p>}
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
      <div className="flex items-center gap-2.5">
        <BellRing className="h-4.5 w-4.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            {status === "denied" ? "Notifikasi diblokir di browser ini" : "Notifikasi belum aktif di perangkat ini"}
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-300/70">
            {status === "denied"
              ? "Aktifkan lewat pengaturan situs di browser Anda, lalu muat ulang halaman ini."
              : "Aktifkan supaya Anda tahu begitu ada pengajuan modal baru — tetap muncul walau browser ditutup."}
          </p>
        </div>
      </div>
      {status !== "denied" && (
        <button
          type="button"
          onClick={enable}
          disabled={isBusy}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-500 disabled:opacity-60"
          )}
        >
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
          Aktifkan Notifikasi
        </button>
      )}
      {feedback && <p className="w-full text-xs text-amber-700/80 dark:text-amber-300/70">{feedback}</p>}
    </div>
  );
}
