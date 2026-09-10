"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LanguagePreference, ThemePreference } from "@/lib/supabase/types";

const GENERIC_ERROR = "Terjadi kesalahan, coba lagi.";
const AVATAR_BUCKET = "avatars";

export type MutationResult = { ok: true } | { ok: false; error: string };
export type ProfileUpdateResult = { ok: true; avatarUrl: string | null } | { ok: false; error: string };

/**
 * Tahap 27 — halaman Pengaturan. Semua fungsi di sini SENGAJA cuma
 * menyentuh kolom non-privileged (full_name, avatar, tema, bahasa) —
 * division/role/username sekarang dijaga trigger
 * `protect_privileged_profile_columns` (migrasi 0023) di level database,
 * jadi bukan cuma "tidak ditawarkan di form ini", tapi memang tidak bisa
 * lewat jalur mana pun selain admin.
 */
export async function updateProfileInfo(formData: FormData): Promise<ProfileUpdateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesi sudah berakhir, silakan masuk ulang." };

  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!fullName) return { ok: false, error: "Nama tidak boleh kosong." };

  const { data: current } = await supabase
    .from("profiles")
    .select("avatar_storage_path")
    .eq("id", user.id)
    .single();

  let avatarUrl: string | null | undefined = undefined;
  let avatarStoragePath: string | null | undefined = undefined;

  const file = formData.get("avatar");
  const removeAvatar = formData.get("removeAvatar") === "1";

  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return { ok: false, error: "File foto bukan gambar." };
    }
    if (file.size > 3 * 1024 * 1024) {
      return { ok: false, error: "Ukuran foto maksimal 3MB." };
    }
    const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "jpg";
    // Diawali user.id sebagai "folder" — inilah yang dicek policy storage
    // (avatars_insert_own dkk di migrasi 0023) supaya tiap orang cuma bisa
    // menulis ke foldernya sendiri.
    const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(storagePath, file, { contentType: file.type || undefined });
    if (uploadError) {
      console.error("[settings] Upload foto profil gagal:", uploadError.message);
      return { ok: false, error: GENERIC_ERROR };
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(storagePath);
    avatarUrl = publicUrl;
    avatarStoragePath = storagePath;
  } else if (removeAvatar) {
    avatarUrl = null;
    avatarStoragePath = null;
  }

  const updatePayload: Record<string, unknown> = { full_name: fullName };
  if (avatarUrl !== undefined) {
    updatePayload.avatar_url = avatarUrl;
    updatePayload.avatar_storage_path = avatarStoragePath;
  }

  const { error } = await supabase.from("profiles").update(updatePayload).eq("id", user.id);

  if (error) {
    console.error("[settings] updateProfileInfo gagal:", error.message);
    // Foto sudah kadung terupload — bersihkan supaya tidak jadi sampah di storage.
    if (avatarStoragePath) await supabase.storage.from(AVATAR_BUCKET).remove([avatarStoragePath]);
    return { ok: false, error: GENERIC_ERROR };
  }

  // Hapus foto lama SETELAH update sukses (baru dianggap benar-benar diganti).
  const oldPath = current?.avatar_storage_path as string | null | undefined;
  if (oldPath && (avatarStoragePath !== undefined || removeAvatar)) {
    await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]);
  }

  revalidatePath("/", "layout");
  return { ok: true, avatarUrl: avatarUrl !== undefined ? avatarUrl : null };
}

export async function updateThemePreference(theme: ThemePreference): Promise<MutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesi sudah berakhir, silakan masuk ulang." };

  const { error } = await supabase.from("profiles").update({ theme_preference: theme }).eq("id", user.id);
  if (error) {
    console.error("[settings] updateThemePreference gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  // Supaya <html> di root layout (server component) langsung ikut kepilih
  // ulang di kunjungan/refresh berikutnya — perubahan instan di tab yang
  // sedang terbuka ditangani langsung di klien (lihat ThemeLanguageForm).
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateLanguagePreference(language: LanguagePreference): Promise<MutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesi sudah berakhir, silakan masuk ulang." };

  const { error } = await supabase.from("profiles").update({ language_preference: language }).eq("id", user.id);
  if (error) {
    console.error("[settings] updateLanguagePreference gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
