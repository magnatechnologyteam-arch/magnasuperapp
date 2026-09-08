"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Tombol "Lanjutkan dengan Google" — dipakai di halaman Login & Register.
 * Memicu alur OAuth PKCE Supabase; setelah pengguna menyetujui di Google,
 * mereka diarahkan balik ke `/auth/callback` (lihat route handler-nya) yang
 * menukar kode OAuth dengan sesi lalu mengarahkan ke dashboard.
 *
 * Ini juga jalan keluar utama kalau pengguna lupa password akun email/nya —
 * selama alamat Gmail mereka sama dengan yang dipakai daftar, atau mereka
 * daftar ulang lewat Google, akun akan otomatis tertaut (Supabase mencocokkan
 * berdasarkan alamat email).
 */
export function GoogleSignInButton({ redirectTo = "/dashboard" }: { redirectTo?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setErrorMessage(null);

    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", redirectTo);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() },
    });

    if (error) {
      setErrorMessage("Google Sign-In belum aktif untuk aplikasi ini. Coba lagi nanti atau pakai email/password.");
      setIsLoading(false);
    }
    // Kalau sukses, browser langsung diarahkan Supabase ke Google — tidak
    // ada state "sukses" di sini karena halaman akan segera berpindah.
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
      >
        <GoogleGlyph className="h-4 w-4" />
        {isLoading ? "Mengarahkan ke Google…" : "Lanjutkan dengan Google"}
      </button>
      {errorMessage && (
        <p className="mt-2 text-center text-xs font-medium text-rose-600 dark:text-rose-300">{errorMessage}</p>
      )}
    </div>
  );
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.89c2.28-2.1 3.56-5.2 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.12A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.61H1.27a12 12 0 0 0 0 10.78l4-3.12Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.12C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}
