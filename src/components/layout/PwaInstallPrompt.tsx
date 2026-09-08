"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const DISMISS_KEY = "magnasuperapp-pwa-install-dismissed";

/** Minimal, cukup untuk `.prompt()`/`.userChoice` — browser tidak menstandarkan tipe event ini secara resmi. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Banner kecil "Install Aplikasi" — muncul begitu browser menganggap
 * MagnaSuperApp layak diinstall (manifest + Service Worker sudah
 * terpenuhi, lihat `src/app/manifest.ts`) DAN belum pernah ditutup
 * manual oleh pengguna di perangkat ini (`localStorage`, bukan server —
 * ini murni preferensi per-perangkat, bukan data yang perlu disinkron).
 *
 * Event `beforeinstallprompt` cuma didukung Chrome/Edge/Android — di
 * Safari iOS event ini tidak pernah muncul (instal lewat Share → "Add to
 * Home Screen" manual), jadi di sana banner ini sengaja tidak pernah
 * tampil sama sekali, bukan bug.
 */
export function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // localStorage bisa saja diblokir (mode privat dsb) — kalau begitu
      // banner tetap boleh tampil, cuma tidak akan "ingat" kalau ditutup.
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function handleInstall() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    // Apa pun pilihannya (accepted/dismissed), event ini cuma bisa dipakai
    // sekali — sembunyikan banner supaya tidak menekan tombol yang sudah mati.
    setVisible(false);
  }

  function handleDismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Diabaikan — paling banter banner muncul lagi di kunjungan berikutnya.
    }
  }

  if (!visible || !promptEvent) return null;

  return (
    <div className="animate-fade-up fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-xl shadow-black/10 dark:border-white/10 dark:bg-zinc-900 sm:inset-x-auto sm:right-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-500 text-white">
        <Download className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">Install MagnaSuperApp</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Akses lebih cepat langsung dari layar utama.</p>
      </div>
      <button
        type="button"
        onClick={handleInstall}
        className="shrink-0 rounded-full bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
      >
        Install
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Tutup"
        title="Tutup"
        className="shrink-0 rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-white/10 dark:hover:text-zinc-300"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
