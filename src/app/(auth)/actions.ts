"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function safeRedirectTarget(value: FormDataEntryValue | null): string {
  const target = typeof value === "string" ? value : "";
  // Hanya izinkan path relatif internal ("/dashboard/...") — mencegah
  // open-redirect kalau ada yang mengutak-atik query string redirectTo.
  return target.startsWith("/") && !target.startsWith("//") ? target : "/dashboard";
}

/**
 * Login pakai USERNAME, bukan email — email asli tiap staf cuma dipakai
 * sebagai alamat pemulihan password (lihat `requestPasswordReset`), bukan
 * untuk masuk. Karena Supabase Auth secara internal tetap berbasis email,
 * kita cari dulu email yang berpasangan dengan username itu lewat service
 * role (supaya tidak perlu RLS publik yang membocorkan email ke siapa pun
 * yang belum login), baru panggil signInWithPassword dengan email tersebut.
 */
export async function signIn(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectTarget(formData.get("redirectTo"));

  if (!username || !password) {
    redirect(`/login?error=${encodeURIComponent("Username dan password wajib diisi.")}`);
  }

  const admin = createAdminClient();
  const { data: profile, error: lookupError } = await admin
    .from("profiles")
    .select("email")
    .eq("username", username)
    .maybeSingle();

  // Dicatat HANYA di terminal server, tidak pernah ditampilkan ke browser —
  // supaya kita bisa lihat persis di titik mana login gagal (username tidak
  // ketemu vs password salah) tanpa membocorkan info itu ke orang yang
  // sedang mencoba login.
  if (lookupError) {
    console.error("[signIn] Query profiles gagal:", lookupError.message);
  }

  if (!profile?.email) {
    console.log(`[signIn] Username "${username}" tidak ditemukan di tabel profiles.`);
    redirect(`/login?error=${encodeURIComponent("Username atau password salah.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: profile.email, password });

  if (error) {
    console.error(`[signIn] signInWithPassword gagal untuk email terkait username "${username}":`, error.message);
    redirect(`/login?error=${encodeURIComponent("Username atau password salah.")}`);
  }

  console.log(`[signIn] Login berhasil untuk username "${username}".`);
  redirect(redirectTo);
}

/**
 * "Lupa password" — diminta lewat EMAIL pemulihan langsung (bukan
 * username), karena bagi pengguna ini lebih masuk akal: mereka mengetik
 * alamat Gmail/email pribadinya sendiri, bukan menebak-nebak username app
 * yang mungkin lupa. Supabase sendiri sudah tidak membocorkan apakah email
 * itu terdaftar atau tidak (pesan sukses selalu sama), jadi kita tidak
 * perlu lagi lapisan "cari email dari username" seperti sebelumnya — cukup
 * teruskan langsung ke `resetPasswordForEmail`.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const genericNotice = "Kalau email itu terdaftar, tautan reset password sudah dikirim ke sana.";

  if (email) {
    try {
      const origin = (await headers()).get("origin") ?? "";
      const supabase = await createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
      });
      // Dicatat HANYA di terminal server (bukan ditampilkan ke browser) —
      // supaya kita bisa lacak kalau email gagal terkirim (redirect URL
      // belum di-allowlist, rate limit Supabase, dsb) tanpa membocorkan
      // detailnya ke orang yang mengisi form ini.
      if (error) {
        console.error("[requestPasswordReset] resetPasswordForEmail gagal:", error.message);
      } else {
        console.log(`[requestPasswordReset] Permintaan reset diproses untuk ${email}.`);
      }
    } catch (err) {
      console.error("[requestPasswordReset] Error tak terduga:", err);
      // Diamkan dengan sengaja ke pengguna — tetap tampilkan pesan generik
      // di bawah, supaya tidak membocorkan info lewat pesan error yang
      // berbeda-beda (mencegah email enumeration).
    }
  }

  redirect(`/lupa-password?notice=${encodeURIComponent(genericNotice)}`);
}

/**
 * Set password baru — dipanggil dari halaman /reset-password SETELAH
 * pengguna klik tautan reset di email (yang menukar kode OAuth-style lewat
 * /auth/callback lebih dulu, jadi di titik ini pengguna sudah punya sesi
 * resmi yang sah untuk mengganti password miliknya sendiri).
 */
export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 6) {
    redirect(`/reset-password?error=${encodeURIComponent("Password minimal 6 karakter.")}`);
  }
  if (password !== confirmPassword) {
    redirect(`/reset-password?error=${encodeURIComponent("Konfirmasi password tidak cocok.")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?error=${encodeURIComponent("Tautan reset password sudah kedaluwarsa, minta ulang lewat 'Lupa password?'.")}`
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/login?notice=${encodeURIComponent("Password berhasil diubah — silakan masuk.")}`);
}
