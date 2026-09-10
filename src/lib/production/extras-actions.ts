"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";
import {
  rowToEquipment,
  rowToEquipmentUsage,
  rowToProjectCheck,
  rowToProjectCrew,
  rowToProjectPhoto,
  type CheckStage,
  type CrewRole,
  type DocumentationTahap,
  type Equipment,
  type EquipmentCategory,
  type EquipmentCondition,
  type EquipmentRow,
  type EquipmentUsage,
  type EquipmentUsageRow,
  type ProjectCheck,
  type ProjectCheckRow,
  type ProjectCrew,
  type ProjectCrewRow,
  type ProjectPhoto,
  type ProjectPhotoRow,
} from "./extras-types";

const PROYEK_PATH = "/dashboard/production/proyek";
const DOKUMENTASI_PATH = "/dashboard/production/dokumentasi";
const ALAT_PATH = "/dashboard/production/alat";
const GENERIC_ERROR = "Terjadi kesalahan, coba lagi.";
const CHECKS_BUCKET = "production-checks";
const DOCS_BUCKET = "production-documentation";

export type MutationResult = { ok: true } | { ok: false; error: string };

/**
 * Checklist instalasi & bongkar (Tahap 28c) — satu baris per (project,
 * stage), di-upsert lewat unique(project_id, stage) di migrasi 0027, sama
 * persis polanya dengan checklist kondisi alat Magnarent (Tahap 28a).
 */
export async function getProjectChecks(projectId: string): Promise<ProjectCheck[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_project_checks")
    .select("*")
    .eq("project_id", projectId)
    .returns<ProjectCheckRow[]>();

  if (error) {
    console.error("[production] getProjectChecks gagal:", error.message);
    return [];
  }
  return (data ?? []).map(rowToProjectCheck);
}

export async function saveProjectCheck(
  projectId: string,
  stage: CheckStage,
  catatan: string,
  formData: FormData
): Promise<MutationResult> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("production_project_checks")
    .select("photo_urls, photo_storage_paths")
    .eq("project_id", projectId)
    .eq("stage", stage)
    .maybeSingle();

  const photoUrls: string[] = existing?.photo_urls ?? [];
  const photoPaths: string[] = existing?.photo_storage_paths ?? [];

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "jpg";
    const storagePath = `${projectId}/${stage}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(CHECKS_BUCKET)
      .upload(storagePath, file, { contentType: file.type || undefined });
    if (uploadError) {
      console.error("[production] Upload foto checklist gagal:", uploadError.message);
      continue;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from(CHECKS_BUCKET).getPublicUrl(storagePath);
    photoUrls.push(publicUrl);
    photoPaths.push(storagePath);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("production_project_checks").upsert(
    {
      project_id: projectId,
      stage,
      catatan: catatan.trim() || null,
      photo_urls: photoUrls,
      photo_storage_paths: photoPaths,
      checked_by: user?.id ?? null,
      checked_at: new Date().toISOString(),
    },
    { onConflict: "project_id,stage" }
  );

  if (error) {
    console.error("[production] saveProjectCheck gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(PROYEK_PATH);
  return { ok: true };
}

export async function removeProjectCheckPhoto(
  projectId: string,
  stage: CheckStage,
  photoUrl: string
): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("production_project_checks")
    .select("photo_urls, photo_storage_paths")
    .eq("project_id", projectId)
    .eq("stage", stage)
    .maybeSingle();

  if (fetchError || !existing) return { ok: false, error: GENERIC_ERROR };

  const urls: string[] = existing.photo_urls ?? [];
  const paths: string[] = existing.photo_storage_paths ?? [];
  const idx = urls.indexOf(photoUrl);
  if (idx === -1) return { ok: true };

  const removedPath = paths[idx];
  urls.splice(idx, 1);
  paths.splice(idx, 1);

  const { error } = await supabase
    .from("production_project_checks")
    .update({ photo_urls: urls, photo_storage_paths: paths })
    .eq("project_id", projectId)
    .eq("stage", stage);

  if (error) {
    console.error("[production] removeProjectCheckPhoto gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  if (removedPath) await supabase.storage.from(CHECKS_BUCKET).remove([removedPath]);
  revalidatePath(PROYEK_PATH);
  return { ok: true };
}

/**
 * Penugasan kru per proyek booth (Tahap 28c) — banyak baris per proyek,
 * nama bebas (bukan menautkan ke akun `profiles`, lihat komentar migrasi
 * 0027 & extras-types.ts).
 */
export async function getProjectCrew(projectId: string): Promise<ProjectCrew[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_project_crew")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .returns<ProjectCrewRow[]>();

  if (error) {
    console.error("[production] getProjectCrew gagal:", error.message);
    return [];
  }
  return (data ?? []).map(rowToProjectCrew);
}

export async function addProjectCrew(
  projectId: string,
  input: { nama: string; peran: CrewRole; kontak?: string; catatan?: string }
): Promise<MutationResult> {
  if (!input.nama.trim()) return { ok: false, error: "Nama kru wajib diisi." };

  const supabase = await createClient();
  const { error } = await supabase.from("production_project_crew").insert({
    project_id: projectId,
    nama: input.nama.trim(),
    peran: input.peran,
    kontak: input.kontak?.trim() || null,
    catatan: input.catatan?.trim() || null,
  });

  if (error) {
    console.error("[production] addProjectCrew gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(PROYEK_PATH);
  return { ok: true };
}

export async function deleteProjectCrew(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("production_project_crew").delete().eq("id", id);
  if (error) {
    console.error("[production] deleteProjectCrew gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(PROYEK_PATH);
  return { ok: true };
}

/**
 * Galeri dokumentasi before/after (Tahap 28c) — dipakai halaman
 * /dashboard/production/dokumentasi, mirip `addPortfolioPhoto` Magnativ
 * tapi selalu bertaut ke satu proyek booth + tahap Sebelum/Sesudah.
 */
export async function addProjectPhoto(formData: FormData): Promise<MutationResult> {
  const projectId = String(formData.get("projectId") ?? "");
  const tahap = String(formData.get("tahap") ?? "") as DocumentationTahap;
  const caption = String(formData.get("caption") ?? "").trim();
  const file = formData.get("photo");

  if (!projectId) return { ok: false, error: "Pilih proyek booth terlebih dahulu." };
  if (tahap !== "Sebelum" && tahap !== "Sesudah") return { ok: false, error: "Tahap tidak valid." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pilih foto terlebih dahulu." };
  if (!file.type.startsWith("image/")) return { ok: false, error: "File harus berupa gambar." };

  const supabase = await createClient();
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "jpg";
  const storagePath = `${projectId}/${tahap.toLowerCase()}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCS_BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined });
  if (uploadError) {
    console.error("[production] Upload foto dokumentasi gagal:", uploadError.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(DOCS_BUCKET).getPublicUrl(storagePath);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("production_project_photos").insert({
    project_id: projectId,
    tahap,
    photo_url: publicUrl,
    storage_path: storagePath,
    caption: caption || null,
    uploaded_by: user?.id ?? null,
  });

  if (error) {
    console.error("[production] addProjectPhoto gagal:", error.message);
    await supabase.storage.from(DOCS_BUCKET).remove([storagePath]);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(DOKUMENTASI_PATH);
  void logActivity({ module: "production", action: "create", entityType: "dokumentasi proyek", detail: tahap });
  return { ok: true };
}

export async function deleteProjectPhoto(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: photoRow } = await supabase
    .from("production_project_photos")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle<Pick<ProjectPhotoRow, "storage_path">>();

  const { error } = await supabase.from("production_project_photos").delete().eq("id", id);
  if (error) {
    console.error("[production] deleteProjectPhoto gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  if (photoRow?.storage_path) await supabase.storage.from(DOCS_BUCKET).remove([photoRow.storage_path]);
  revalidatePath(DOKUMENTASI_PATH);
  return { ok: true };
}

/**
 * Alat berat/perkakas + riwayat pemakaian (Tahap 28c) — registry alat mirip
 * `MaterialManager`, riwayat pemakaian mirip `MaintenanceLogModal` Magnarent
 * tapi mencatat proyek & tanggal pinjam/kembali, bukan biaya servis.
 */
export async function getEquipment(): Promise<Equipment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_equipment")
    .select("*")
    .order("name", { ascending: true })
    .returns<EquipmentRow[]>();

  if (error) {
    console.error("[production] getEquipment gagal:", error.message);
    return [];
  }
  return (data ?? []).map(rowToEquipment);
}

function validateEquipmentInput(input: { name: string }): string | null {
  if (!input.name?.trim()) return "Nama alat wajib diisi.";
  return null;
}

export async function addEquipment(input: {
  name: string;
  kategori: EquipmentCategory;
  kondisi: EquipmentCondition;
  catatan?: string;
}): Promise<MutationResult> {
  const validationError = validateEquipmentInput(input);
  if (validationError) return { ok: false, error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("production_equipment").insert({
    name: input.name.trim(),
    kategori: input.kategori,
    kondisi: input.kondisi,
    catatan: input.catatan?.trim() || null,
  });

  if (error) {
    console.error("[production] addEquipment gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(ALAT_PATH);
  void logActivity({ module: "production", action: "create", entityType: "alat/perkakas", entityLabel: input.name });
  return { ok: true };
}

export async function updateEquipment(
  id: string,
  input: { name: string; kategori: EquipmentCategory; kondisi: EquipmentCondition; catatan?: string }
): Promise<MutationResult> {
  const validationError = validateEquipmentInput(input);
  if (validationError) return { ok: false, error: validationError };

  const supabase = await createClient();
  const { error } = await supabase
    .from("production_equipment")
    .update({
      name: input.name.trim(),
      kategori: input.kategori,
      kondisi: input.kondisi,
      catatan: input.catatan?.trim() || null,
    })
    .eq("id", id);

  if (error) {
    console.error("[production] updateEquipment gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(ALAT_PATH);
  void logActivity({ module: "production", action: "update", entityType: "alat/perkakas", entityLabel: input.name });
  return { ok: true };
}

export async function deleteEquipment(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: equipmentRow } = await supabase
    .from("production_equipment")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("production_equipment").delete().eq("id", id);
  if (error) {
    console.error("[production] deleteEquipment gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(ALAT_PATH);
  void logActivity({ module: "production", action: "delete", entityType: "alat/perkakas", entityLabel: equipmentRow?.name });
  return { ok: true };
}

export async function getEquipmentUsage(equipmentId: string): Promise<EquipmentUsage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_equipment_usage")
    .select("*")
    .eq("equipment_id", equipmentId)
    .order("tanggal_pinjam", { ascending: false })
    .returns<EquipmentUsageRow[]>();

  if (error) {
    console.error("[production] getEquipmentUsage gagal:", error.message);
    return [];
  }
  return (data ?? []).map(rowToEquipmentUsage);
}

export async function addEquipmentUsage(
  equipmentId: string,
  input: { projectId?: string; digunakanOleh: string; tanggalPinjam: string; tanggalKembali?: string; catatan?: string }
): Promise<MutationResult> {
  if (!input.digunakanOleh.trim()) return { ok: false, error: "Nama pemakai wajib diisi." };
  if (!input.tanggalPinjam) return { ok: false, error: "Tanggal pinjam wajib diisi." };
  if (input.tanggalKembali && input.tanggalKembali < input.tanggalPinjam) {
    return { ok: false, error: "Tanggal kembali tidak boleh sebelum tanggal pinjam." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("production_equipment_usage").insert({
    equipment_id: equipmentId,
    project_id: input.projectId || null,
    digunakan_oleh: input.digunakanOleh.trim(),
    tanggal_pinjam: input.tanggalPinjam,
    tanggal_kembali: input.tanggalKembali || null,
    catatan: input.catatan?.trim() || null,
    created_by: user?.id ?? null,
  });

  if (error) {
    console.error("[production] addEquipmentUsage gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(ALAT_PATH);
  void logActivity({ module: "production", action: "create", entityType: "pemakaian alat", entityLabel: input.digunakanOleh });
  return { ok: true };
}

export async function markEquipmentUsageReturned(id: string, tanggalKembali: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("production_equipment_usage")
    .update({ tanggal_kembali: tanggalKembali })
    .eq("id", id);

  if (error) {
    console.error("[production] markEquipmentUsageReturned gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(ALAT_PATH);
  return { ok: true };
}

export async function deleteEquipmentUsage(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("production_equipment_usage").delete().eq("id", id);
  if (error) {
    console.error("[production] deleteEquipmentUsage gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(ALAT_PATH);
  return { ok: true };
}
