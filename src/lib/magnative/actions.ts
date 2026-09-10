"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyDivision } from "@/lib/push/notify";
import { logActivity } from "@/lib/activity/log";
import type {
  Client,
  ContentPost,
  ContentRequest,
  ContentRequestStatus,
  ContentStatus,
  CreativeAssetCategory,
  Project,
  ProjectCost,
} from "./types";

const MODULE_PATH = "/dashboard/magnative";
const GENERIC_ERROR = "Terjadi kesalahan, coba lagi.";
const PORTFOLIO_BUCKET = "magnative-portfolio";
const CREATIVE_ASSETS_BUCKET = "magnative-assets";

export type MutationResult = { ok: true } | { ok: false; error: string };

/**
 * Pola sama persis dengan `src/lib/magnarent/actions.ts`: tulis ke Supabase
 * lalu `revalidatePath` — itu otomatis membuat Next.js mengambil ulang data
 * di `src/app/dashboard/magnative/layout.tsx` (Server Component) dan
 * mengirim props baru ke `MagnativeDataProvider`. RLS (migrasi 0005) sudah
 * membatasi baris yang kebaca/tertulis cuma milik divisi Magnative/akses
 * penuh, jadi pengecekan divisi tidak diulang di sini.
 */
/** Divalidasi ulang di server — form di UI sudah punya `required`, tapi Server Action ini bisa dipanggil langsung sebagai fungsi. */
function validateClientInput(input: Omit<Client, "id">): string | null {
  if (!input.name?.trim() || !input.industry?.trim() || !input.picName?.trim()) {
    return "Nama klien, industri, dan nama PIC wajib diisi.";
  }
  return null;
}

export async function addClient(input: Omit<Client, "id">): Promise<MutationResult> {
  const validationError = validateClientInput(input);
  if (validationError) return { ok: false, error: validationError };

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
  const validationError = validateClientInput(input);
  if (validationError) return { ok: false, error: validationError };

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

  // Cegah hapus klien yang masih punya proyek AKTIF (Pitching/Perencanaan/
  // Berjalan) — dulu cuma dicek di UI (getActiveProjectsForClient);
  // ditegakkan ulang di sini supaya tidak bisa dilewati dengan memanggil
  // action ini langsung. "Pitching" ikut dihitung aktif sejak migrasi 0016
  // — lead yang masih dalam proses pitching juga bukan klien yang aman
  // dihapus begitu saja.
  const { data: activeRows, error: activeError } = await supabase
    .from("magnative_projects")
    .select("id")
    .eq("client_id", id)
    .in("status", ["Pitching", "Perencanaan", "Berjalan"])
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

/** Sama alasannya dengan `validateClientInput` — dicek ulang di server, bukan cuma diandalkan dari form. */
function validateMagnativeProjectInput(input: Omit<Project, "id">): string | null {
  if (!input.name?.trim()) return "Nama proyek wajib diisi.";
  if (!input.tanggalMulai || !input.tanggalSelesai || input.tanggalMulai > input.tanggalSelesai) {
    return "Tanggal selesai tidak boleh sebelum tanggal mulai.";
  }
  if (!Number.isFinite(input.budget) || input.budget < 0) {
    return "Budget tidak boleh negatif.";
  }
  if (input.dpAmount !== undefined && (!Number.isFinite(input.dpAmount) || input.dpAmount < 0)) {
    return "Nominal DP tidak valid.";
  }
  return null;
}

export async function addProject(input: Omit<Project, "id">): Promise<MutationResult> {
  const validationError = validateMagnativeProjectInput(input);
  if (validationError) return { ok: false, error: validationError };

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
    dp_amount: input.dpAmount ?? 0,
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
  const validationError = validateMagnativeProjectInput(input);
  if (validationError) return { ok: false, error: validationError };

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
      dp_amount: input.dpAmount ?? 0,
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

/**
 * Biaya/pengeluaran per proyek (migrasi 0017) — lihat komentar `ProjectCost`
 * di types.ts. Tidak perlu cek `status` proyek: biaya boleh dicatat di
 * tahap apa pun, termasuk "Pitching" yang belum pasti deal.
 */
export async function addProjectCost(input: Omit<ProjectCost, "id">): Promise<MutationResult> {
  if (!input.description?.trim()) {
    return { ok: false, error: "Deskripsi biaya wajib diisi." };
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "Nominal biaya harus lebih dari 0." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("magnative_project_costs").insert({
    project_id: input.projectId,
    description: input.description,
    amount: input.amount,
    cost_date: input.costDate,
    created_by: user?.id ?? null,
  });

  if (error) {
    console.error("[magnative] addProjectCost gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  void logActivity({
    module: "magnative",
    action: "create",
    entityType: "biaya proyek",
    entityLabel: input.description,
  });
  return { ok: true };
}

export async function deleteProjectCost(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: costRow } = await supabase
    .from("magnative_project_costs")
    .select("description")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("magnative_project_costs").delete().eq("id", id);
  if (error) {
    console.error("[magnative] deleteProjectCost gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  void logActivity({
    module: "magnative",
    action: "delete",
    entityType: "biaya proyek",
    entityLabel: costRow?.description,
  });
  return { ok: true };
}

/** Sama untuk add & update — status "Revisi" tanpa catatan bikin reviewer lain tidak tahu apa yang perlu diperbaiki. */
function validateContentPostInput(input: Omit<ContentPost, "id">): string | null {
  if (!input.title?.trim()) return "Judul konten wajib diisi.";
  if (!input.tanggalPosting) return "Tanggal posting wajib diisi.";
  if (input.status === "Revisi" && !input.feedbackRevisi?.trim()) {
    return 'Catatan revisi wajib diisi kalau status "Revisi".';
  }
  return null;
}

export async function addContentPost(input: Omit<ContentPost, "id">): Promise<MutationResult> {
  const validationError = validateContentPostInput(input);
  if (validationError) return { ok: false, error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("magnative_content_posts").insert({
    client_id: input.clientId ?? null,
    title: input.title,
    platform: input.platform,
    tanggal_posting: input.tanggalPosting,
    status: input.status,
    catatan: input.catatan ?? null,
    feedback_revisi: input.status === "Revisi" ? input.feedbackRevisi!.trim() : null,
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
  const validationError = validateContentPostInput(input);
  if (validationError) return { ok: false, error: validationError };

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
      feedback_revisi: input.status === "Revisi" ? input.feedbackRevisi!.trim() : null,
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

/**
 * Aksi cepat ganti status konten (Tahap 28b) — dipakai tombol
 * "Setujui"/"Minta Revisi"/"Tandai Tayang" di baris tabel ContentPlanner,
 * TANPA harus buka modal edit penuh. Terpisah dari `updateContentPost`
 * (yang mengubah seluruh field) supaya klik satu tombol tidak perlu
 * mengirim ulang judul/platform/tanggal yang tidak berubah.
 */
export async function updateContentStatus(
  id: string,
  status: ContentStatus,
  feedbackRevisi?: string
): Promise<MutationResult> {
  if (status === "Revisi" && !feedbackRevisi?.trim()) {
    return { ok: false, error: 'Catatan revisi wajib diisi supaya tim tahu apa yang perlu diperbaiki.' };
  }

  const supabase = await createClient();
  const { data: postRow } = await supabase
    .from("magnative_content_posts")
    .select("title")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("magnative_content_posts")
    .update({
      status,
      feedback_revisi: status === "Revisi" ? feedbackRevisi!.trim() : null,
    })
    .eq("id", id);

  if (error) {
    console.error("[magnative] updateContentStatus gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  void logActivity({
    module: "magnative",
    action: "update",
    entityType: "konten",
    entityLabel: postRow?.title,
    detail: `status → ${status}`,
  });
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

/**
 * Permintaan konten dari klien (Tahap 28b, migrasi 0026) — lihat komentar
 * `ContentRequest` di types.ts untuk kenapa tabel ini terpisah dari
 * `ContentPost`.
 */
export async function addContentRequest(input: Omit<ContentRequest, "id" | "status">): Promise<MutationResult> {
  if (!input.clientId) {
    return { ok: false, error: "Klien wajib dipilih." };
  }
  if (!input.title?.trim() || !input.description?.trim()) {
    return { ok: false, error: "Judul dan deskripsi kebutuhan wajib diisi." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("magnative_content_requests").insert({
    client_id: input.clientId,
    title: input.title.trim(),
    description: input.description.trim(),
    deadline: input.deadline || null,
    priority: input.priority,
    catatan: input.catatan?.trim() || null,
    created_by: user?.id ?? null,
  });

  if (error) {
    console.error("[magnative] addContentRequest gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);

  void notifyDivision("magnative", {
    title: "Permintaan Konten Baru",
    body: `Permintaan konten "${input.title.trim()}" baru masuk — prioritas ${input.priority}.`,
    url: "/dashboard/magnative/permintaan",
  });
  void logActivity({ module: "magnative", action: "create", entityType: "permintaan konten", entityLabel: input.title });
  return { ok: true };
}

export async function updateContentRequestStatus(id: string, status: ContentRequestStatus): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: reqRow } = await supabase
    .from("magnative_content_requests")
    .select("title")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("magnative_content_requests").update({ status }).eq("id", id);
  if (error) {
    console.error("[magnative] updateContentRequestStatus gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  void logActivity({
    module: "magnative",
    action: "update",
    entityType: "permintaan konten",
    entityLabel: reqRow?.title,
    detail: `status → ${status}`,
  });
  return { ok: true };
}

export async function deleteContentRequest(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: reqRow } = await supabase
    .from("magnative_content_requests")
    .select("title")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("magnative_content_requests").delete().eq("id", id);
  if (error) {
    console.error("[magnative] deleteContentRequest gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(MODULE_PATH);
  void logActivity({ module: "magnative", action: "delete", entityType: "permintaan konten", entityLabel: reqRow?.title });
  return { ok: true };
}

/**
 * Galeri aset kreatif (Tahap 28b, migrasi 0026) — pola upload sama persis
 * dengan `addPortfolioPhoto` (FormData supaya bisa membawa `File`,
 * upload-lalu-insert supaya file yatim piatu dibersihkan kalau insert
 * metadatanya gagal), bedanya file di sini boleh gambar ATAU video (bukan
 * cuma gambar), jadi `file_type` disimpan supaya UI tahu cara menampilkan
 * pratinjaunya (`<img>`/`<video>`/ikon generik untuk file lain seperti PDF
 * template desain).
 */
export async function addCreativeAsset(formData: FormData): Promise<MutationResult> {
  const supabase = await createClient();
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "Lainnya") as CreativeAssetCategory;
  const caption = String(formData.get("caption") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Pilih file terlebih dahulu." };
  }
  if (!title) {
    return { ok: false, error: "Judul aset wajib diisi." };
  }

  const fileType: "image" | "video" | "other" = file.type.startsWith("image/")
    ? "image"
    : file.type.startsWith("video/")
      ? "video"
      : "other";

  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "bin";
  const storagePath = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(CREATIVE_ASSETS_BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined });

  if (uploadError) {
    console.error("[magnative] Upload aset kreatif gagal:", uploadError.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(CREATIVE_ASSETS_BUCKET).getPublicUrl(storagePath);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: insertError } = await supabase.from("magnative_creative_assets").insert({
    title,
    category,
    file_url: publicUrl,
    storage_path: storagePath,
    file_type: fileType,
    caption: caption || null,
    uploaded_by: user?.id ?? null,
  });

  if (insertError) {
    console.error("[magnative] Simpan data aset kreatif gagal:", insertError.message);
    await supabase.storage.from(CREATIVE_ASSETS_BUCKET).remove([storagePath]);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  void logActivity({ module: "magnative", action: "create", entityType: "aset kreatif", entityLabel: title });
  return { ok: true };
}

export async function deleteCreativeAsset(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: assetRow } = await supabase
    .from("magnative_creative_assets")
    .select("title, storage_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("magnative_creative_assets").delete().eq("id", id);
  if (error) {
    console.error("[magnative] deleteCreativeAsset gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  if (assetRow?.storage_path) {
    await supabase.storage.from(CREATIVE_ASSETS_BUCKET).remove([assetRow.storage_path]);
  }
  revalidatePath(MODULE_PATH);
  void logActivity({ module: "magnative", action: "delete", entityType: "aset kreatif", entityLabel: assetRow?.title });
  return { ok: true };
}
