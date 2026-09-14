"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updatePassword } from "../actions";
import { PasswordInput } from "@/components/ui/PasswordInput";

type Status = "checking" | "ready" | "invalid";

/**
 * Perbaikan bug "klik tautan reset password di Gmail tidak keluar halaman
 * ganti password" — akar masalahnya: tautan reset dari Supabase BISA datang
 * dalam 3 bentuk berbeda tergantung konfigurasi proyek, dan sebelumnya
 * /reset-password (Server Component polos, tanpa JS sama sekali) hanya bisa
 * "berharap" sesi sudah ada lewat cookie. Komponen client ini menangani
 * SEMUA kemungkinan bentuknya begitu halaman dimuat di browser:
 *
 * 1. Hash fragment ala alur lama (`#access_token=...&refresh_token=...`) —
 *    WAJIB ditangani di sini (client), karena fragment URL tidak pernah
 *    ikut terkirim ke server sama sekali (browser memotongnya sebelum
 *    request HTTP dibuat) — Route Handler atau Server Component mana pun
 *    TIDAK MUNGKIN bisa membacanya.
 * 2. `?code=...` ala PKCE — ditukar lewat `exchangeCodeForSession`.
 * 3. `?token_hash=...&type=recovery` ala alur OTP terbaru Supabase —
 *    ditukar lewat `verifyOtp`.
 *
 * Ketiganya memakai Supabase client BROWSER (bukan server) — `@supabase/ssr`
 * otomatis menyinkronkan sesi hasilnya ke cookie, jadi begitu salah satu
 * berhasil, Server Action `updatePassword` di server (dipanggil saat form di
 * bawah disubmit) akan langsung melihat sesi yang sama lewat cookie itu.
 */
export function ResetPasswordClient({ error }: { error?: string }) {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = createClient();

      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        // Bersihkan token dari address bar begitu dipakai — jangan sampai
        // tertinggal di riwayat browser/ke-share kalau URL disalin.
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        if (!cancelled) setStatus(sessionError ? "invalid" : "ready");
        return;
      }

      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled) setStatus(exchangeError ? "invalid" : "ready");
        return;
      }

      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");
      if (tokenHash && type === "recovery") {
        const { error: otpError } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
        if (!cancelled) setStatus(otpError ? "invalid" : "ready");
        return;
      }

      // Tidak ada token di URL sama sekali — mungkin halaman ini di-reload
      // setelah salah satu proses di atas sukses (sesi sudah ada di cookie).
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled) setStatus(session ? "ready" : "invalid");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-sm text-zinc-500 dark:text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Memeriksa tautan reset password…
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Tautan Tidak Valid</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Tautan reset password ini sudah kedaluwarsa atau sudah pernah dipakai sebelumnya.
        </p>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Minta tautan baru lewat halaman &quot;Lupa password?&quot; di bawah.
        </div>
        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/lupa-password" className="font-semibold text-[#B8860B] hover:underline dark:text-[#D4AF37]">
            Minta tautan reset baru
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Atur Password Baru</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Masukkan password baru untuk akun Anda.</p>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <form action={updatePassword} className="mt-6 space-y-4">
        <div>
          <label htmlFor="reset-password-new" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Password Baru
          </label>
          <PasswordInput id="reset-password-new" name="password" required minLength={6} autoComplete="new-password" placeholder="min. 6 karakter" />
        </div>
        <div>
          <label htmlFor="reset-password-confirm" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Konfirmasi Password
          </label>
          <PasswordInput
            id="reset-password-confirm"
            name="confirmPassword"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="ulangi password baru"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-full bg-gradient-to-r from-[#D4AF37] via-[#E5484D] to-[#0B7A63] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          Simpan Password Baru
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/login" className="font-semibold text-[#B8860B] hover:underline dark:text-[#D4AF37]">
          Batal, kembali ke halaman masuk
        </Link>
      </p>
    </div>
  );
}
