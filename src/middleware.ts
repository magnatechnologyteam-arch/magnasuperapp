import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_AUTH_ROUTES = ["/login", "/register", "/lupa-password"];

// Path prefix modul -> divisi yang boleh mengaksesnya. "/reset-password"
// SENGAJA tidak masuk PUBLIC_AUTH_ROUTES: rute itu dikunjungi sesaat
// setelah pengguna (jadi "sudah login" lewat sesi recovery) klik tautan
// reset email — kalau ikut di-redirect-away seperti /login, alur ganti
// password akan rusak sebelum sempat submit form.
const MODULE_DIVISION_PREFIXES: Array<{ prefix: string; division: string }> = [
  { prefix: "/dashboard/magnative", division: "magnative" },
  { prefix: "/dashboard/magnarent", division: "magnarent" },
  { prefix: "/dashboard/production", division: "production" },
];

const ADMIN_PREFIX = "/dashboard/admin";
// Area khusus akun investor (read only lintas divisi + Approve/Reject
// Pengajuan Modal, lihat migrasi 0019) — akses penuh ("all") boleh ikut
// mengintip halaman ini, staf divisi manapun TIDAK.
const INVESTOR_PREFIX = "/dashboard/investor";

/**
 * Middleware ini punya tiga tugas dalam satu jalan:
 * 1. Menyegarkan sesi Supabase (token refresh) pada setiap request.
 * 2. Menjaga rute: `/dashboard/**` wajib login, dan pengguna yang SUDAH
 *    login tidak boleh melihat /login, /register, /lupa-password lagi.
 * 3. Membatasi akses per DIVISI — staf satu bagian (mis. "production")
 *    tidak bisa membuka modul bagian lain, dan halaman admin
 *    ("Kelola Pengguna") hanya untuk akses penuh (division === "all").
 *
 * `division` diambil dari `user.app_metadata`, BUKAN `user_metadata` —
 * app_metadata hanya bisa diisi lewat Admin API/service role, jadi tidak
 * bisa diutak-atik sendiri oleh pengguna dari browser (beda dengan
 * user_metadata yang bisa diubah lewat `supabase.auth.updateUser()`).
 */
export async function middleware(request: NextRequest) {
  // Bug ditemukan lewat auth_logs Supabase: Next.js App Router otomatis
  // mem-PREFETCH di background untuk tiap <Link> yang masuk viewport —
  // halaman dgn banyak link (Dashboard Hub, Topbar, sidebar) bisa memicu
  // PULUHAN request middleware nyaris bersamaan. Tiap request di sini
  // memanggil supabase.auth.getUser(), yang otomatis me-refresh access
  // token kalau sudah dekat kedaluwarsa — karena refresh token Supabase
  // "rotating" (sekali pakai), banyak refresh BERSAMAAN dari request-request
  // prefetch itu saling tabrakan: satu menang dapat token baru, sisanya
  // gagal dengan error "Refresh Token Not Found" dan sesi jadi mati/invalid
  // TANPA aksi eksplisit apa pun dari pengguna. Ini persis yang terlihat di
  // log produksi (bukan cuma dev lokal) dan cocok dengan laporan "profil/
  // pencarian/notifikasi tiba-tiba tidak bisa diakses" — sebenarnya BUKAN
  // fitur itu sendiri yang rusak, tapi seluruh sesi login mati diam-diam
  // sehingga SEMUA halaman /dashboard/** ikut tidak bisa diakses.
  //
  // Perbaikan: request prefetch murni (bukan navigasi sungguhan yang
  // diklik/diketik pengguna) tidak perlu memicu pengecekan/refresh sesi di
  // sini sama sekali — biarkan lolos apa adanya. Ini aman karena proteksi
  // data yang sesungguhnya ada di RLS Postgres (lihat can_access_division
  // dkk di setiap tabel), bukan di middleware ini — middleware cuma lapisan
  // redirect UX. Navigasi ASLI (klik link / ketik URL) tetap kena semua
  // pengecekan session-refresh & divisi di bawah seperti biasa.
  if (
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("sec-purpose")?.includes("prefetch")
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute = PUBLIC_AUTH_ROUTES.includes(pathname);
  const isProtectedRoute = pathname.startsWith("/dashboard");

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && isProtectedRoute) {
    const division = (user.app_metadata as { division?: string } | null | undefined)?.division ?? "production";

    if (division !== "all") {
      const isAdminRoute = pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);
      const isBlockedModule = MODULE_DIVISION_PREFIXES.some(
        (m) => (pathname === m.prefix || pathname.startsWith(`${m.prefix}/`)) && m.division !== division
      );
      const isInvestorRoute = pathname === INVESTOR_PREFIX || pathname.startsWith(`${INVESTOR_PREFIX}/`);
      const isBlockedInvestorRoute = isInvestorRoute && division !== "investor";

      if (isAdminRoute || isBlockedModule || isBlockedInvestorRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
