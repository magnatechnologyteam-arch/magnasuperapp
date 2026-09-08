"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyDivision } from "@/lib/push/notify";
import { logActivity } from "@/lib/activity/log";
import type { Client, ContentPost, Project } from "./types";

const MODULE_PATH = "/dashboard/magnative";
const GENERIC_ERROR = "Terjadi kesalahan, coba lagi.";
const PORTFOLIO_BUCKET = "magnative-portfolio";

export type MutationResult = { ok: true } | { ok: false; error: string };

/**
 * Pola sama persis dengan `src/lib/magnarent/actions.ts`: tulis ke Supabase
 * lalu `revalidatePath` — itu otomatis membuat Next.js mengambil ulang data
 * di `src/app/dashboard/magnative/layout.tsx` (Server Component) dan
 * mengirim props baru ke `MagnativeDataProvider`. RLS (migrasi 0005) sudah
 * membatasi baris yang kebaca/tertulis cuma milik divisi Magnative/akses
 * penuh, jadi pengecekan divisi tidak diulang di sini.
 */
export async function addClient(input: Omit<Client, "id">): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("magnative_clients").insert({
    name: input.name,
    industry: input.industry,
    pic_name: input.picName,
    pic_phone: input.picPhone ?? null,
    pic_email: input.picEmail ?? null,
    status: input.status,
    catatan: input.catatan ?? null,
  });

  if (error) {
    console.error("[magnative] addClient gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  void logActivity({ module: "magnative", action: "create", entityType: "klien", entityLabel: input.name });
  return { ok: true };
}

export async function updateClient(id: string, input: Omit<Client, "id">): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("magnative_clients")
    .update({
      name: input.name,
      industry: input.industry,
      pic_name: input.picName,
      pic_phone: input.picPhone ?? null,
      pic_email: input.picEmail ?? null,
      status: input.status,
      catatan: input.catatan ?? null,
    })
    .eq("id", id);

  if (error) {
    console.error("[magnative] updateClient gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  void logActivity({ module: "magnative", action: "update", entityType: "klien", entityLabel: input.name });
  return { ok: true };
}

export async function deleteClient(id: string): Promise<MutationResult> {
  const supabase = await createClient();

  // Cegah hapus klien yang masih punya proyek AKTIF (Perencanaan/Berjalan)
  // — dulu cuma dicek di UI (getActiveProjectsForClient); ditegakkan ulang
  // di sini supaya tidak bisa dilewati dengan memanggil action ini langsung.
  const { data: activeRows, error: activeError } = await supabase
    .from("magnative_projects")
    .select("id")
    .eq("client_id", id)
    .in("status", ["Perencanaan", "Berjalan"])
    .limit(1);

  if (activeError) {
    console.error("[magnative] Cek proyek aktif sebelum hapus klien gagal:", activeError.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  if (activeRows && activeRows.length > 0) {
    return { ok: false, error: "Klien masih punya proyek aktif, tidak bisa dihapus." };
  }

  const { data: clientRow } = await supabase.from("magnative_clients").select("name").eq("id", id).maybeSingle();

  const { error } = await supabase.from("magnative_clients").delete().eq("id", id);
  if (error) {
    console.error("[magnative] deleteClient gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  void logActivity({ module: "magnative", action: "delete", entityType: "klien", entityLabel: clientRow?.name });
  return { ok: true };
}

export async function addProject(input: Omit<Project, "id">): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("magnative_projects").insert({
    client_id: input.clientId,
    name: input.name,
    type: input.type,
    tanggal_mulai: input.tanggalMulai,
    tanggal_selesai: input.tanggalSelesai,
    budget: input.budget,
    status: input.status,
    status_pembayaran: input.statusPembayaran,
    catatan: input.catatan ?? null,
  });

  if (error) {
    console.error("[magnative] addProject gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);

  // Beri tahu tim Magnative (+ akun akses penuh) ada proyek baru — tidak
  // di-`await` supaya kegagalan kirim notifikasi tidak menahan respons.
  const {
    data: { user: projectActor },
  } = await supabase.auth.getUser();
  void notifyDivision(
    "magnative",
    {
      title: "Proyek Baru — Magnativ",
      body: `Proyek "${input.name}" (${input.type}) baru dibuat.`,
      url: "/dashboard/magnative/proyek",
    },
    projectActor?.id
  );
  void logActivity({ module: "magnative", action: "create", entityType: "proyek", entityLabel: input.name });

  return { ok: true };
}

export async function updateProject(id: string, input: Omit<Project, "id">): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("magnative_projects")
    .update({
      client_id: input.clientId,
      name: input.name,
      type: input.type,
      tanggal_mulai: input.tanggalMulai,
      tanggal_selesai: input.tanggalSelesai,
      budget: input.budget,
      status: input.status,
      status_pembayaran: input.statusPembayaran,
      catatan: input.catatan ?? null,
    })
    .eq("id", id);

  if (error) {
    console.error("[magnative] updateProject gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  void logActivity({
    module: "magnative",
    action: "update",
    entityType: "proyek",
    entityLabel: input.name,
    detail: `status: ${input.status}`,
  });
  return { ok: true };
}

export async function deleteProject(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: projectRow } = await supabase.from("magnative_projects").select("name").eq("id", id).maybeSingle();

  const { error } = await supabase.from("magnative_projects").delete().eq("id", id);
  if (error) {
    console.error("[magnative] deleteProject gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  void logActivity({ module: "magnative", action: "delete", entityType: "proyek", entityLabel: projectRow?.name });
  return { ok: true };
}

export async function addContentPost(input: Omit<ContentPost, "id">): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("magnative_content_posts").insert({
    client_id: input.clientId ?? null,
    title: input.title,
    platform: input.platform,
    tanggal_posting: input.tanggalPosting,
    status: input.status,
    catatan: input.catatan ?? null,
  });

  if (error) {
    console.error("[magnative] addContentPost gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  void logActivity({ module: "magnative", action: "create", entityType: "konten", entityLabel: input.title });
  return { ok: true };
}

export async function updateContentPost(id: string, input: Omit<ContentPost, "id">): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("magnative_content_posts")
    .update({
      client_id: input.clientId ?? null,
      title: input.title,
      platform: input.platform,
      tanggal_posting: input.tanggalPosting,
      status: input.status,
      catatan: input.catatan ?? null,
    })
    .eq("id", id);

  if (error) {
    console.error("[magnative] updateContentPost gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  void logActivity({ module: "magnative", action: "update", entityType: "konten", entityLabel: input.title });
  return { ok: true };
}

export async function deleteContentPost(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: postRow } = await supabase
    .from("magnative_content_posts")
    .select("title")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("magnative_content_posts").delete().eq("id", id);
  if (error) {
    console.error("[magnative] deleteContentPost gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  void logActivity({ module: "magnative", action: "delete", entityType: "konten", entityLabel: postRow?.title });
  return { ok: true };
}

/**
 * Galeri portofolio (migrasi 0012) — menggantikan PlaceholderGallery statis
 * di halaman Ringkasan Magnative. Pakai `FormData` (bukan objek biasa
 * seperti action lain di file ini) karena ini satu-satunya action yang
 * perlu membawa `File` lewat batas Server Action — payload JSON tidak bisa
 * membawa data biner.
 *
 * Urutan upload-lalu-insert (bukan sebaliknya) sengaja dipilih supaya kalau
 * insert baris metadata gagal, file yang sudah terlanjur ter-upload
 * langsung dibersihkan (`storage.remove`) — tidak ada file yatim piatu di
 * bucket yang tidak tercatat di tabel.
 */
export async function addPortfolioPhoto(formData: FormData): Promise<MutationResult> {
  const supabase = await createClient();
  const file = formData.get("photo");
  const title = String(formData.get("title") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Pilih foto terlebih dahulu." };
  }
  if (!title) {
    return { ok: false, error: "Judul foto wajib diisi." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "File yang dipilih bukan gambar." };
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "jpg";
  const storagePath = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PORTFOLIO_BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined });

  if (uploadError) {
    console.error("[magnative] Upload foto portofolio gagal:", uploadError.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(storagePath);

  const { error: insertError } = await supabase.from("magnative_portfolio").insert({
    photo_url: publicUrl,
    storage_path: storagePath,
    title,
    caption: caption || null,
  });

  if (insertError) {
    console.error("[magnative] Simpan data foto portofolio gagal:", insertError.message);
    await supabase.storage.from(PORTFOLIO_BUCKET).remove([storagePath]);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  void logActivity({ module: "magnative", action: "create", entityType: "portofolio", entityLabel: title });
  return { ok: true };
}

export async function updatePortfolioPhoto(
  id: string,
  input: { title: string; caption?: string }
): Promise<MutationResult> {
  const supabase = await createClient();
  const title = input.title.trim();
  if (!title) {
    return { ok: false, error: "Judul foto wajib diisi." };
  }

  const { error } = await supabase
    .from("magnative_portfolio")
    .update({ title, caption: input.caption?.trim() || null })
    .eq("id", id);

  if (error) {
    console.error("[magnative] updatePortfolioPhoto gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  void logActivity({ module: "magnative", action: "update", entityType: "portofolio", entityLabel: title });
  return { ok: true };
}

export async function deletePortfolioPhoto(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: photoRow } = await supabase
    .from("magnative_portfolio")
    .select("title, storage_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("magnative_portfolio").delete().eq("id", id);
  if (error) {
    console.error("[magnative] deletePortfolioPhoto gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  if (photoRow?.storage_path) {
    await supabase.storage.from(PORTFOLIO_BUCKET).remove([photoRow.storage_path]);
  }
  revalidatePath(MODULE_PATH);
  void logActivity({ module: "magnative", action: "delete", entityType: "portofolio", entityLabel: photoRow?.title });
  return { ok: true };
}
