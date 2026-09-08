"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Client, ContentPost, Project } from "./types";

const MODULE_PATH = "/dashboard/magnative";
const GENERIC_ERROR = "Terjadi kesalahan, coba lagi.";

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

  const { error } = await supabase.from("magnative_clients").delete().eq("id", id);
  if (error) {
    console.error("[magnative] deleteClient gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
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
    catatan: input.catatan ?? null,
  });

  if (error) {
    console.error("[magnative] addProject gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
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
      catatan: input.catatan ?? null,
    })
    .eq("id", id);

  if (error) {
    console.error("[magnative] updateProject gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  return { ok: true };
}

export async function deleteProject(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("magnative_projects").delete().eq("id", id);
  if (error) {
    console.error("[magnative] deleteProject gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
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
  return { ok: true };
}

export async function deleteContentPost(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("magnative_content_posts").delete().eq("id", id);
  if (error) {
    console.error("[magnative] deleteContentPost gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  return { ok: true };
}
