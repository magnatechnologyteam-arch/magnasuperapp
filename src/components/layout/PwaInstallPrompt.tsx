"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

const DISMISS_KEY = "magnasuperapp-pwa-install-dismissed";

/** Minimal, cukup untuk `.prompt()`/`.userChoice` — browser tidak menstandarkan tipe event ini secara resmi. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari tidak punya `display-mode: standalone` bawaan seperti Chrome —
  // dia expose `navigator.standalone` sendiri begitu app sudah diinstall.
  const nav = window.navigator as Navigator & { standalone?: boolean };
  const mediaQuery = typeof window.matchMedia === "function" ? window.matchMedia("(display-mode: standalone)") : null;
  return mediaQuery?.matches === true || nav.standalone === true;
}

function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document);
  // Chrome/Firefox/Edge di iOS SEMUANYA jalan di atas mesin WebKit Safari
  // (kebijakan Apple), tapi UA mereka menyisipkan token sendiri
  // (CriOS/FxiOS/EdgiOS) — perlu dikecualikan supaya tidak ikut kena.
  const isOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIos && !isOtherBrowser;
}

/**
 * Banner kecil "Install Aplikasi".
 *
 * Tahap 36 — sebelumnya banner ini (dan pendaftaran Service Worker yang jadi
 * salah satu syarat wajib `beforeinstallprompt` bisa muncul di Chrome/Edge/
 * Android) SAMA-SAMA cuma aktif di dalam `AppShell`, yaitu SETELAH login
 * (lihat manifest.ts baris ~14: "Service Worker sudah terdaftar otomatis...
 * lewat PushNotificationBell" — komponen itu cuma ada di Topbar dashboard).
 * Akibatnya siapa pun yang buka link tapi belum/tidak login (mis. teman yang
 * cuma dikirimi link buat coba-coba, mendarat di halaman /login) TIDAK
 * PERNAH bisa diinstal sama sekali — Service Worker-nya belum pernah
 * terdaftar sama sekali di perangkat itu, jadi browser tidak punya alasan
 * memunculkan prompt install. Perbaikannya: komponen ini sekarang dipasang
 * SEKALI di root layout (src/app/layout.tsx), bukan lagi di dalam AppShell —
 * jadi aktif di halaman publik (/login, /register) maupun dashboard, dan
 * Service Worker didaftarkan sendiri di sini begitu komponen mount, tidak
 * lagi bergantung pada PushNotificationBell yang cuma ada di balik login.
 *
 * Sekaligus ditambah jalur kedua: di iOS, event `beforeinstallprompt` TIDAK
 * PERNAH ada sama sekali di browser apa pun (kebijakan Apple, bukan bug) —
 * satu-satunya cara install adalah manual lewat Share -> "Add to Home
 * Screen". Sebelumnya di iOS banner ini tidak pernah tampil apa-apa
 * (pengguna iPhone tidak pernah tahu aplikasi ini bisa diinstal). Sekarang
 * pengguna Safari iOS yang belum install dapat banner instruksi manual.
 */
export function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Daftarkan Service Worker SEDINI mungkin begitu halaman apa pun dibuka —
    // TIDAK menunggu pengguna login/buka dashboard dulu. `.register()` aman
    // dipanggil berkali-kali (browser cukup mengembalikan registrasi yang
    // sudah ada kalau script/scope sama), jadi tidak bentrok dengan
    // pendaftaran lain yang masih tetap ada di usePushSubscription.ts.
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Diabaikan — kalau gagal (mis. browser sangat lama), prompt install
        // asli memang tidak akan pernah muncul, tapi tidak perlu melempar
        // error yang mengganggu apa pun di halaman.
      });
    }

    if (isStandaloneDisplay()) return; // Sudah terinstall — tidak perlu tawari lagi.

    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // localStorage bisa saja diblokir (mode privat dsb) — kalau begitu
      // banner tetap boleh tampil, cuma tidak akan "ingat" kalau ditutup.
    }

    if (isIosSafari()) {
      setShowIosInstructions(true);
      setVisible(true);
      return; // iOS tidak pernah mengirim `beforeinstallprompt` — cukup sampai sini.
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

  if (!visible || (!promptEvent && !showIosInstructions)) return null;

  return (
    <div className="animate-fade-up fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-xl shadow-black/10 dark:border-white/10 dark:bg-zinc-900 sm:inset-x-auto sm:right-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-500 text-white">
        {showIosInstructions ? <Share className="h-4.5 w-4.5" /> : <Download className="h-4.5 w-4.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">Install MagnaSuperApp</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {showIosInstructions
            ? 'Tap ikon Share lalu pilih "Add to Home Screen".'
            : "Akses lebih cepat langsung dari layar utama."}
        </p>
      </div>
      {!showIosInstructions && (
        <button
          type="button"
          onClick={handleInstall}
          className="shrink-0 rounded-full bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          Install
        </button>
      )}
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
