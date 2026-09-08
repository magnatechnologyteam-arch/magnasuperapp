"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireFullAccess } from "@/app/dashboard/admin/actions";

/**
 * Hapus SATU baris log aktivitas. Dijaga dobel: middleware.ts + halaman
 * ini sendiri sudah menolak akses selain division "all", dan
 * requireFullAccess() di sini mengecek ulang di server — juga policy RLS
 * "activity_log_delete_full_access" (migrasi 0009) yang cuma mengizinkan
 * akses penuh. Dipakai client Supabase biasa (bukan admin), karena RLS
 * saja sudah cukup untuk aksi ini (tidak perlu melewati RLS seperti di
 * admin/actions.ts yang menyentuh auth.users).
 */
export async function deleteActivityLogEntry(formData: FormData) {
  await requireFullAccess();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    redirect(`/dashboard/admin/aktivitas?error=${encodeURIComponent("Data tidak valid.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("activity_log").delete().eq("id", id);

  if (error) {
    redirect(`/dashboard/admin/aktivitas?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/admin/aktivitas");
  redirect(`/dashboard/admin/aktivitas?notice=${encodeURIComponent("Satu baris aktivitas berhasil dihapus.")}`);
}

/** Hapus SEMUA baris log aktivitas — aksi besar, konfirmasi ganda di UI (lihat ActivityLogTable). */
export async function deleteAllActivityLogs() {
  await requireFullAccess();

  const supabase = await createClient();
  // `.neq` dengan nilai yang tidak mungkin cocok = trik umum Supabase
  // untuk delete tanpa filter kolom tertentu (delete-all butuh WHERE).
  const { error } = await supabase
    .from("activity_log")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    redirect(`/dashboard/admin/aktivitas?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/admin/aktivitas");
  redirect(`/dashboard/admin/aktivitas?notice=${encodeURIComponent("Semua log aktivitas berhasil dihapus.")}`);
}
