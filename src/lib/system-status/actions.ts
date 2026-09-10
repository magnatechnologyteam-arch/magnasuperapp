"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const GENERIC_ERROR = "Terjadi kesalahan, coba lagi.";

export type MaintenanceStatus = {
  active: boolean;
  message: string;
};

export type MutationResult = { ok: true } | { ok: false; error: string };

/**
 * Dipanggil dari `src/app/dashboard/layout.tsx` di SETIAP halaman dashboard
 * (server-side, bareng `getCurrentProfile()`) supaya banner-nya konsisten
 * tampil/hilang tanpa perlu polling dari klien. Gagal-aman: kalau baris
 * `system_status` entah kenapa belum ada / query error, anggap saja tidak
 * ada maintenance — jangan sampai bug di fitur kecil ini malah mengganggu
 * akses ke seluruh dashboard.
 */
export async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("system_status")
    .select("maintenance_active, maintenance_message")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return { active: false, message: "" };
  return { active: data.maintenance_active, message: data.maintenance_message };
}

/**
 * Toggle dari halaman /dashboard/admin/status-sistem — RLS
 * `system_status_write` (migrasi 0024) sudah membatasi cuma akses penuh
 * yang bisa berhasil UPDATE baris ini, jadi pengecekan divisi di sini
 * sifatnya cuma pesan error yang lebih ramah, bukan satu-satunya lapisan
 * keamanan.
 */
export async function setMaintenanceBanner(active: boolean, message: string): Promise<MutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesi sudah berakhir, silakan masuk ulang." };

  const trimmedMessage = message.trim();
  if (active && !trimmedMessage) {
    return { ok: false, error: "Pesan banner tidak boleh kosong kalau mau dinyalakan." };
  }

  const { error } = await supabase
    .from("system_status")
    .update({
      maintenance_active: active,
      maintenance_message: trimmedMessage || "Sistem sedang diperbarui, mohon tunggu sebentar.",
      updated_by: user.id,
    })
    .eq("id", 1);

  if (error) {
    console.error("[system-status] setMaintenanceBanner gagal:", error.message);
    if (error.code === "42501") {
      return { ok: false, error: "Cuma akses penuh yang boleh mengubah ini." };
    }
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
