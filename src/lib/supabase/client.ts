import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client untuk dipakai di Client Component (browser). Setiap
 * pemanggilan membuat instance baru — ringan, dan direkomendasikan resmi
 * oleh Supabase untuk App Router (bukan singleton module-level).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
