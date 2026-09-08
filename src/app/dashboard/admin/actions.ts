"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/server";
import type { Division } from "@/lib/supabase/types";

const VALID_DIVISIONS: Division[] = ["magnarent", "magnative", "production", "all"];
const USERNAME_PATTERN = /^[a-z0-9._-]{3,20}$/;

/**
 * Semua Server Action di file ini mengubah data lewat service role
 * (`createAdminClient`), yang MELEWATI RLS sepenuhnya — jadi setiap satu
 * WAJIB mengecek ulang di server bahwa pemanggilnya memang division "all",
 * TIDAK cukup mengandalkan middleware atau UI yang menyembunyikan tombol.
 */
async function requireFullAccess() {
  const profile = await getCurrentProfile();
  if (!profile || profile.division !== "all") {
    redirect("/dashboard");
  }
  return profile;
}

export async function createStaffAccount(formData: FormData) {
  await requireFullAccess();

  const fullName = String(formData.get("fullName") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const recoveryEmail = String(formData.get("recoveryEmail") ?? "").trim();
  const division = String(formData.get("division") ?? "") as Division;
  const password = String(formData.get("password") ?? "");

  if (!fullName || !username || !recoveryEmail || !password) {
    redirect(`/dashboard/admin/pengguna?error=${encodeURIComponent("Semua kolom wajib diisi.")}`);
  }
  if (!USERNAME_PATTERN.test(username)) {
    redirect(
      `/dashboard/admin/pengguna?error=${encodeURIComponent(
        "Username 3-20 karakter: huruf kecil, angka, titik, garis bawah, atau strip."
      )}`
    );
  }
  if (!VALID_DIVISIONS.includes(division)) {
    redirect(`/dashboard/admin/pengguna?error=${encodeURIComponent("Divisi tidak valid.")}`);
  }
  if (password.length < 6) {
    redirect(`/dashboard/admin/pengguna?error=${encodeURIComponent("Password minimal 6 karakter.")}`);
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: recoveryEmail,
    password,
    email_confirm: true,
    // full_name di user_metadata (boleh diubah sendiri nanti oleh pemilik
    // akun); username & division di app_metadata (cuma admin yang bisa
    // ubah — lihat catatan di middleware.ts & migration 0003).
    user_metadata: { full_name: fullName },
    app_metadata: { username, division },
  });

  if (error) {
    const message = error.message.toLowerCase().includes("already been registered")
      ? "Email pemulihan ini sudah dipakai akun lain."
      : error.message;
    redirect(`/dashboard/admin/pengguna?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/dashboard/admin/pengguna");
  redirect(`/dashboard/admin/pengguna?notice=${encodeURIComponent(`Akun ${fullName} berhasil dibuat.`)}`);
}

export async function updateStaffDivision(formData: FormData) {
  const currentProfile = await requireFullAccess();

  const userId = String(formData.get("userId") ?? "");
  const division = String(formData.get("division") ?? "") as Division;

  if (!userId || !VALID_DIVISIONS.includes(division)) {
    redirect(`/dashboard/admin/pengguna?error=${encodeURIComponent("Data tidak valid.")}`);
  }
  if (userId === currentProfile.id) {
    redirect(`/dashboard/admin/pengguna?error=${encodeURIComponent("Tidak bisa mengubah divisi akun sendiri.")}`);
  }

  const admin = createAdminClient();
  const { data: existing } = await admin.auth.admin.getUserById(userId);
  const currentAppMetadata = existing?.user?.app_metadata ?? {};

  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...currentAppMetadata, division },
  });
  if (authError) {
    redirect(`/dashboard/admin/pengguna?error=${encodeURIComponent(authError.message)}`);
  }

  const { error: profileError } = await admin.from("profiles").update({ division }).eq("id", userId);
  if (profileError) {
    redirect(`/dashboard/admin/pengguna?error=${encodeURIComponent(profileError.message)}`);
  }

  revalidatePath("/dashboard/admin/pengguna");
  redirect(`/dashboard/admin/pengguna?notice=${encodeURIComponent("Divisi berhasil diperbarui.")}`);
}

export async function deleteStaffAccount(formData: FormData) {
  const currentProfile = await requireFullAccess();

  const userId = String(formData.get("userId") ?? "");

  if (!userId) {
    redirect(`/dashboard/admin/pengguna?error=${encodeURIComponent("Data tidak valid.")}`);
  }
  if (userId === currentProfile.id) {
    redirect(`/dashboard/admin/pengguna?error=${encodeURIComponent("Tidak bisa menghapus akun sendiri.")}`);
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    redirect(`/dashboard/admin/pengguna?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/admin/pengguna");
  redirect(`/dashboard/admin/pengguna?notice=${encodeURIComponent("Akun berhasil dihapus.")}`);
}
