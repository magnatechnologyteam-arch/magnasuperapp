import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Klien Supabase dengan SERVICE ROLE KEY — HANYA boleh dipakai di kode
 * server (Server Action / Route Handler), TIDAK PERNAH diimpor ke komponen
 * klien. Klien ini melewati Row Level Security sepenuhnya dan dipakai
 * khusus untuk operasi admin: cari email dari username saat login/lupa
 * password, serta membuat/mengubah/menghapus akun staf lewat Supabase Auth
 * Admin API (`auth.admin.*`) di halaman "Kelola Pengguna".
 *
 * `SUPABASE_SERVICE_ROLE_KEY` SENGAJA tidak diberi prefix `NEXT_PUBLIC_` —
 * kalau sampai bocor ke browser, siapa pun bisa membaca/mengubah semua data
 * tanpa terikat RLS sama sekali. Ambil nilainya dari Supabase Dashboard →
 * Project Settings → API → "service_role" secret.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum diset di .env.local — ambil dari Supabase Dashboard > Project Settings > API."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
