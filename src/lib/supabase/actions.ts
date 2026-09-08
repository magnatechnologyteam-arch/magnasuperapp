"use server";

import { redirect } from "next/navigation";
import { createClient } from "./server";

/**
 * Sign out — dipakai sebagai Server Action dari tombol "Keluar" di Topbar.
 * Diletakkan terpisah dari src/app/(auth)/actions.ts (sign in/sign up)
 * supaya bisa diimpor dari komponen dashboard tanpa ikut menyeret rute
 * grup (auth).
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
