"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyDivision } from "@/lib/push/notify";
import { logActivity } from "@/lib/activity/log";
import { ACTIVE_BOOTH_STATUSES, findMaterialConflicts, type MaterialConflict } from "./availability";
import { rowToBoothProject, rowToMaterial, type BoothProjectRow, type MaterialRow } from "./mappers";
import type { BoothStatus, MaterialItem, MaterialUsage } from "./types";

const MODULE_PATH = "/dashboard/production";
const GENERIC_ERROR = "Terjadi kesalahan, coba lagi.";

export type MutationResult = { ok: true } | { ok: false; error: string };

/**
 * Pola sama persis dengan `src/lib/magnarent/actions.ts`: tulis ke Supabase
 * lalu `revalidatePath` — Next.js otomatis mengambil ulang data di
 * `src/app/dashboard/production/layout.tsx` dan mengirim props baru ke
 * `ProductionDataProvider`. RLS (migrasi 0006) sudah membatasi baris yang
 * kebaca/tertulis cuma milik divisi Production/akses penuh.
 */
export async function addMaterial(input: Omit<MaterialItem, "id">): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("production_materials").insert({
    name: input.name,
    category: input.category,
    unit: input.unit,
    location: input.location,
    stock: input.stock,
    min_stock: input.minStock,
    price_per_unit: input.pricePerUnit,
  });

  if (error) {
    console.error("[production] addMaterial gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  void logActivity({ module: "production", action: "create", entityType: "material", entityLabel: input.name });
  await notifyLowStockIfNeeded(supabase, input.name, input.stock, input.minStock);
  return { ok: true };
}

export async function updateMaterial(id: string, input: Omit<MaterialItem, "id">): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("production_materials")
    .update({
      name: input.name,
      category: input.category,
      unit: input.unit,
      location: input.location,
      stock: input.stock,
      min_stock: input.minStock,
      price_per_unit: input.pricePerUnit,
    })
    .eq("id", id);

  if (error) {
    console.error("[production] updateMaterial gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  void logActivity({ module: "production", action: "update", entityType: "material", entityLabel: input.name });
  await notifyLowStockIfNeeded(supabase, input.name, input.stock, input.minStock);
  return { ok: true };
}

/**
 * Dipanggil setelah tambah/ubah material — kalau stok sudah di titik minimum
 * atau di bawahnya, kirim satu notifikasi ke tim Production (+ akses penuh).
 * Tidak di-`await` oleh pemanggil (dipanggil dengan `await` di sini tapi
 * `notifyDivision` sendiri tidak melempar error) supaya kegagalan kirim
 * notifikasi tidak pernah membatalkan aksi simpan material yang sudah sukses.
 */
async function notifyLowStockIfNeeded(
  supabase: Awaited<ReturnType<typeof createClient>>,
  materialName: string,
  stock: number,
  minStock: number
): Promise<void> {
  if (stock > minStock) return;
  const {
    data: { user: materialActor },
  } = await supabase.auth.getUser();
  void notifyDivision(
    "production",
    {
      title: "Stok Menipis — Production",
      body: `Stok "${materialName}" tersisa ${stock}, sudah di titik minimum (${minStock}).`,
      url: "/dashboard/production/gudang",
    },
    materialActor?.id
  );
}

export async function deleteMaterial(id: string): Promise<MutationResult> {
  const supabase = await createClient();

  // Cegah hapus material yang masih dialokasikan ke proyek booth AKTIF —
  // dulu cuma dicek di UI (getActiveProjectsForMaterial); ditegakkan ulang
  // di sini supaya tidak bisa dilewati dengan memanggil action ini langsung.
  // `materials` disimpan sebagai jsonb array, jadi dicek pakai containment
  // operator `@>` — cukup mengandung objek dengan materialId ini.
  const { data: activeRows, error: activeError } = await supabase
    .from("production_booth_projects")
    .select("id, status, materials")
    .in("status", ACTIVE_BOOTH_STATUSES)
    .returns<Pick<BoothProjectRow, "id" | "status" | "materials">[]>();

  if (activeError) {
    console.error("[production] Cek proyek aktif sebelum hapus material gagal:", activeError.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  const stillUsed = (activeRows ?? []).some((p) =>
    (p.materials ?? []).some((m: MaterialUsage) => m.materialId === id)
  );
  if (stillUsed) {
    return { ok: false, error: "Material masih dialokasikan ke proyek booth aktif, tidak bisa dihapus." };
  }

  const { data: materialRow } = await supabase.from("production_materials").select("name").eq("id", id).maybeSingle();

  const { error } = await supabase.from("production_materials").delete().eq("id", id);
  if (error) {
    console.error("[production] deleteMaterial gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  void logActivity({ module: "production", action: "delete", entityType: "material", entityLabel: materialRow?.name });
  return { ok: true };
}

export type NewBoothProjectInput = {
  name: string;
  clientId?: string;
  namaKlien: string;
  lokasiAcara: string;
  status: BoothStatus;
  tanggalMulai: string;
  tanggalInstalasi: string;
  budget: number;
  materials: MaterialUsage[];
  catatan?: string;
};

export type SaveBoothProjectResult =
  | { ok: true }
  | { ok: false; conflicts: MaterialConflict[] }
  | { ok: false; error: string };

/** Ambil ulang material + proyek terkini dari DB lalu pakai ulang logika cek stok yang sama persis (src/lib/production/availability.ts) — aturan bisnisnya tidak berubah, cuma sumber datanya sekarang Supabase. */
async function checkMaterialAvailability(
  supabase: Awaited<ReturnType<typeof createClient>>,
  requested: MaterialUsage[],
  excludeProjectId?: string
): Promise<MaterialConflict[] | { error: string }> {
  const [materialsResult, projectsResult] = await Promise.all([
    supabase.from("production_materials").select("*").returns<MaterialRow[]>(),
    supabase
      .from("production_booth_projects")
      .select("*")
      .in("status", ACTIVE_BOOTH_STATUSES)
      .returns<BoothProjectRow[]>(),
  ]);

  if (materialsResult.error) {
    console.error("[production] Ambil data material gagal:", materialsResult.error.message);
    return { error: GENERIC_ERROR };
  }
  if (projectsResult.error) {
    console.error("[production] Ambil data proyek gagal:", projectsResult.error.message);
    return { error: GENERIC_ERROR };
  }

  const materials = (materialsResult.data ?? []).map(rowToMaterial);
  const projects = (projectsResult.data ?? []).map(rowToBoothProject);
  return findMaterialConflicts(requested, materials, projects, excludeProjectId);
}

export async function addProject(input: NewBoothProjectInput): Promise<SaveBoothProjectResult> {
  const supabase = await createClient();

  // Hanya alokasi proyek yang statusnya aktif yang benar-benar menahan
  // stok — proyek baru dengan status Selesai/Dibatalkan tidak perlu dicek.
  if (ACTIVE_BOOTH_STATUSES.includes(input.status)) {
    const conflicts = await checkMaterialAvailability(supabase, input.materials);
    if ("error" in conflicts) return { ok: false, error: conflicts.error };
    if (conflicts.length > 0) return { ok: false, conflicts };
  }

  const { error } = await supabase.from("production_booth_projects").insert({
    name: input.name,
    client_id: input.clientId ?? null,
    nama_klien: input.namaKlien,
    lokasi_acara: input.lokasiAcara,
    status: input.status,
    tanggal_mulai: input.tanggalMulai,
    tanggal_instalasi: input.tanggalInstalasi,
    budget: input.budget,
    materials: input.materials,
    catatan: input.catatan ?? null,
  });

  if (error) {
    console.error("[production] addProject gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);

  // Beri tahu tim Production (+ akun akses penuh) ada proyek booth baru —
  // tidak di-`await` supaya kegagalan kirim notifikasi tidak menahan respons.
  const {
    data: { user: boothActor },
  } = await supabase.auth.getUser();
  void notifyDivision(
    "production",
    {
      title: "Proyek Booth Baru — Production",
      body: `Proyek "${input.name}" untuk ${input.namaKlien} baru dibuat.`,
      url: "/dashboard/production/proyek",
    },
    boothActor?.id
  );
  void logActivity({
    module: "production",
    action: "create",
    entityType: "proyek booth",
    entityLabel: input.name,
    detail: input.namaKlien,
  });

  return { ok: true };
}

export async function updateProject(id: string, input: NewBoothProjectInput): Promise<SaveBoothProjectResult> {
  const supabase = await createClient();

  // Proyek ini sendiri dikecualikan dari perhitungan alokasinya
  // (excludeProjectId) supaya tidak "bentrok dengan dirinya sendiri".
  if (ACTIVE_BOOTH_STATUSES.includes(input.status)) {
    const conflicts = await checkMaterialAvailability(supabase, input.materials, id);
    if ("error" in conflicts) return { ok: false, error: conflicts.error };
    if (conflicts.length > 0) return { ok: false, conflicts };
  }

  const { error } = await supabase
    .from("production_booth_projects")
    .update({
      name: input.name,
      client_id: input.clientId ?? null,
      nama_klien: input.namaKlien,
      lokasi_acara: input.lokasiAcara,
      status: input.status,
      tanggal_mulai: input.tanggalMulai,
      tanggal_instalasi: input.tanggalInstalasi,
      budget: input.budget,
      materials: input.materials,
      catatan: input.catatan ?? null,
    })
    .eq("id", id);

  if (error) {
    console.error("[production] updateProject gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  void logActivity({
    module: "production",
    action: "update",
    entityType: "proyek booth",
    entityLabel: input.name,
    detail: `status: ${input.status}`,
  });
  return { ok: true };
}

export async function deleteProject(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: projectRow } = await supabase
    .from("production_booth_projects")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("production_booth_projects").delete().eq("id", id);
  if (error) {
    console.error("[production] deleteProject gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  void logActivity({
    module: "production",
    action: "delete",
    entityType: "proyek booth",
    entityLabel: projectRow?.name,
  });
  return { ok: true };
}

/**
 * Aksi cepat dari papan Jadwal (kanban) untuk memajukan tahap produksi.
 * Sengaja tidak melalui pengecekan konflik material — proyek yang sudah
 * disetujui alokasinya boleh berpindah tahap tanpa harus mengisi ulang form.
 */
export async function updateProjectStatus(id: string, status: BoothStatus): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: projectRow } = await supabase
    .from("production_booth_projects")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("production_booth_projects").update({ status }).eq("id", id);
  if (error) {
    console.error("[production] updateProjectStatus gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  void logActivity({
    module: "production",
    action: "status_change",
    entityType: "proyek booth",
    entityLabel: projectRow?.name,
    detail: `status → ${status}`,
  });
  return { ok: true };
}
