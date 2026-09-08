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

      if (isAdminRoute || isBlockedModule) {
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
