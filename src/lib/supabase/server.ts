import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Division, Profile } from "./types";

/**
 * Supabase client untuk dipakai di Server Component, Server Action, dan
 * Route Handler — baca/tulis cookie sesi lewat Next.js `cookies()`.
 *
 * `setAll` dibungkus try/catch karena Server Component tidak boleh menulis
 * cookie (akan dilempar Next.js) — itu tidak masalah selama middleware
 * (`src/middleware.ts`) yang menyegarkan sesi pada setiap request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Dipanggil dari Server Component — aman diabaikan karena
            // middleware sudah menangani refresh sesi.
          }
        },
      },
    }
  );
}

/**
 * Helper bersama: ambil user + baris profiles yang sedang login, dipakai
 * dari dashboard/layout.tsx (untuk Topbar) dan Hub page (untuk sapaan).
 * Mengembalikan null kalau belum login — meski dalam praktiknya rute
 * /dashboard/** sudah dijaga middleware, jadi ini lebih sebagai jaring
 * pengaman daripada jalur utama.
 */
export async function getCurrentProfile(): Promise<(Profile & { email: string }) | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return {
    id: user.id,
    email: user.email ?? "",
    full_name: profile?.full_name ?? "",
    username: profile?.username ?? null,
    // Fail-closed: kalau baris profiles belum sempat terisi (race trigger)
    // atau division tidak dikenali, anggap akses paling terbatas.
    division: (profile?.division as Division | undefined) ?? "production",
    role: profile?.role ?? "member",
    created_at: profile?.created_at ?? user.created_at,
  };
}
