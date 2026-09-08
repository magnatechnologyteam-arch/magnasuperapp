import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Route Handler untuk callback OAuth (Google Sign-In) via alur PKCE Supabase.
 *
 * Google mengarahkan browser kembali ke sini dengan query `?code=...` setelah
 * pengguna menyetujui login. Kita tukar kode itu dengan sesi (cookie) lewat
 * `exchangeCodeForSession`, lalu redirect ke tujuan akhir (`next`, default
 * `/dashboard`). Kalau ada error dari provider (mis. pengguna membatalkan),
 * redirect balik ke halaman login dengan pesan error.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextParam = requestUrl.searchParams.get("next");
  const oauthError = requestUrl.searchParams.get("error_description");

  const origin = requestUrl.origin;
  const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  if (oauthError) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(oauthError)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent("Gagal masuk dengan Google: " + error.message)}`
      );
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
