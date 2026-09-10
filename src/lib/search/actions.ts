"use server";

import { createClient } from "@/lib/supabase/server";

export type SearchResult = {
  module: string;
  entityType: string;
  entityId: string;
  title: string;
  subtitle: string;
  url: string;
};

type SearchResultRow = {
  module: string;
  entity_type: string;
  entity_id: string;
  title: string;
  subtitle: string;
  url: string;
};

/**
 * Dipanggil dari `GlobalSearch` (client component di Topbar) tiap pengguna
 * mengetik di kotak cari header — meneruskan ke RPC `global_search`
 * (migrasi 0022) yang UNION ALL lintas semua tabel operasional. RPC-nya
 * `security invoker`, jadi hasilnya OTOMATIS dibatasi RLS sesuai divisi
 * pemanggil — tidak perlu filter tambahan di sini.
 *
 * Query di bawah 2 karakter sengaja tidak menyentuh database sama sekali
 * (RPC-nya sendiri juga menjaga ini, tapi dicek dulu di sini supaya tidak
 * ada round-trip ke server untuk kasus yang jelas-jelas belum layak dicari).
 */
export async function searchGlobal(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("global_search", { q: trimmed });

  if (error) {
    console.error("[search] searchGlobal gagal:", error.message);
    return [];
  }

  return ((data ?? []) as SearchResultRow[]).map((row) => ({
    module: row.module,
    entityType: row.entity_type,
    entityId: row.entity_id,
    title: row.title,
    subtitle: row.subtitle,
    url: row.url,
  }));
}
