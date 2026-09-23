import type {
  AssetComment,
  Client,
  ClientStatus,
  ContentPost,
  ContentRequest,
  ContentRequestPriority,
  ContentRequestStatus,
  ContentStatus,
  CreativeAsset,
  CreativeAssetCategory,
  CreativeAssetFileType,
  Platform,
  PaymentStatus,
  PipelineFile,
  PipelineStage,
  PortfolioFolder,
  PortfolioPhoto,
  Project,
  ProjectCost,
  ProjectStatus,
  ProjectTask,
  ProjectTaskStatus,
  ProjectType,
  ProjectVendor,
  Vendor,
  VendorCategory,
} from "./types";

/**
 * Bentuk baris mentah dari Supabase (snake_case, sesuai kolom di migrasi
 * 0005) — dipisah dari `actions.ts` karena file itu ber-"use server" dan
 * semua export-nya wajib fungsi async (aturan Next.js).
 */
export type ClientRow = {
  id: string;
  name: string;
  industry: string;
  pic_name: string;
  pic_phone: string | null;
  pic_email: string | null;
  status: ClientStatus;
  catatan: string | null;
};

export type ProjectRow = {
  id: string;
  client_id: string | null;
  name: string;
  type: ProjectType;
  tanggal_mulai: string;
  tanggal_selesai: string;
  budget: number;
  status: ProjectStatus;
  status_pembayaran: PaymentStatus;
  dp_amount: number;
  catatan: string | null;
  /** Rekomendasi 1 laporan gap-event vs SOP, migrasi 0063. */
  alasan_kalah: string | null;
  /** Rekomendasi 2 laporan gap-event vs SOP, migrasi 0064. */
  pipeline_stage: PipelineStage | null;
};

export type ContentPostRow = {
  id: string;
  client_id: string | null;
  title: string;
  platform: Platform;
  tanggal_posting: string;
  status: ContentStatus;
  catatan: string | null;
  feedback_revisi: string | null;
};

export function rowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    industry: row.industry,
    picName: row.pic_name,
    picPhone: row.pic_phone ?? undefined,
    picEmail: row.pic_email ?? undefined,
    status: row.status,
    catatan: row.catatan ?? undefined,
  };
}

export function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    // Klien rujukan bisa saja sudah dihapus (client_id null, lihat komentar
    // ON DELETE SET NULL di migrasi 0005) — `clientName` di ProjectManager.tsx
    // sudah fallback ke "—" untuk id yang tidak ketemu di daftar klien.
    clientId: row.client_id ?? "",
    name: row.name,
    type: row.type,
    tanggalMulai: row.tanggal_mulai,
    tanggalSelesai: row.tanggal_selesai,
    budget: row.budget,
    status: row.status,
    statusPembayaran: row.status_pembayaran,
    dpAmount: row.dp_amount ?? 0,
    catatan: row.catatan ?? undefined,
    alasanKalah: row.alasan_kalah ?? undefined,
    pipelineStage: row.pipeline_stage ?? undefined,
  };
}

export function rowToContentPost(row: ContentPostRow): ContentPost {
  return {
    id: row.id,
    clientId: row.client_id ?? undefined,
    title: row.title,
    platform: row.platform,
    tanggalPosting: row.tanggal_posting,
    status: row.status,
    catatan: row.catatan ?? undefined,
    feedbackRevisi: row.feedback_revisi ?? undefined,
  };
}

export type ContentRequestRow = {
  id: string;
  client_id: string;
  title: string;
  description: string;
  deadline: string | null;
  priority: ContentRequestPriority;
  status: ContentRequestStatus;
  catatan: string | null;
};

export function rowToContentRequest(row: ContentRequestRow): ContentRequest {
  return {
    id: row.id,
    clientId: row.client_id,
    title: row.title,
    description: row.description,
    deadline: row.deadline ?? undefined,
    priority: row.priority,
    status: row.status,
    catatan: row.catatan ?? undefined,
  };
}

export type CreativeAssetRow = {
  id: string;
  title: string;
  category: CreativeAssetCategory;
  file_url: string;
  storage_path: string;
  file_type: CreativeAssetFileType;
  caption: string | null;
};

export function rowToCreativeAsset(row: CreativeAssetRow): CreativeAsset {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    fileUrl: row.file_url,
    storagePath: row.storage_path,
    fileType: row.file_type,
    caption: row.caption ?? undefined,
  };
}

/** Bentuk baris `magnative_project_costs` (migrasi 0017) — tabel ini
 * dibiarkan ada untuk riwayat lama, tapi TIDAK ditulis/dibaca lagi oleh
 * aplikasi sejak Tahap C modul "Realisasi Event" (migrasi 0050). Tipe &
 * mapper ini disimpan sekadar dokumentasi/keperluan tooling admin di masa
 * depan — lihat `rowToProjectCostFromExpense` di bawah untuk sumber data
 * yang sekarang benar-benar dipakai. */
export type ProjectCostRow = {
  id: string;
  project_id: string;
  description: string;
  amount: number;
  cost_date: string;
};

export function rowToProjectCost(row: ProjectCostRow): ProjectCost {
  return {
    id: row.id,
    projectId: row.project_id,
    description: row.description,
    amount: row.amount,
    costDate: row.cost_date,
    // Skema lama tidak punya kolom ini (lihat komentar `ProjectCost` di
    // types.ts) — nilai bawaan cuma supaya tipenya cocok, mapper ini sendiri
    // sudah tidak dipanggil di mana pun.
    category: "Lain-lain",
    paymentMethod: "",
  };
}

/**
 * Baris `event_expenses` (migrasi 0049) yang sudah difilter
 * `source_type = 'magnative_project'` — dipetakan balik ke bentuk
 * `ProjectCost` supaya UI lama (ProjectCostModal, ArusKasProyekView) tidak
 * perlu tahu skema tabel sumbernya sudah berubah (Tahap C, migrasi 0050).
 * `description` diambil dari `notes` (isi form Biaya Proyek disimpan ke
 * situ); kalau kosong (mis. entri dari halaman Realisasi Event tanpa
 * keterangan), jatuh ke nama kategori supaya tidak tampil blank.
 */
export type MagnativeProjectCostExpenseRow = {
  id: string;
  source_id: string | null;
  category: string;
  notes: string | null;
  amount: number;
  expense_date: string;
  payment_method: string;
};

export function rowToProjectCostFromExpense(row: MagnativeProjectCostExpenseRow): ProjectCost {
  return {
    id: row.id,
    projectId: row.source_id ?? "",
    description: row.notes?.trim() || row.category,
    amount: row.amount,
    costDate: row.expense_date,
    category: row.category,
    paymentMethod: row.payment_method,
  };
}

/** Baris `magnative_portfolio_folders` (migrasi 0057) — "album"-nya; judul/keterangan sekarang di sini, bukan per foto. */
export type PortfolioFolderRow = {
  id: string;
  title: string;
  caption: string | null;
  created_at: string;
};

/** Baris `magnative_portfolio` pasca-migrasi 0057 — `title`/`caption` lama sudah dipindah ke `PortfolioFolderRow`, digantikan `folder_id`/`position`. */
export type PortfolioPhotoRow = {
  id: string;
  folder_id: string;
  photo_url: string;
  storage_path: string;
  position: number;
};

function rowToPortfolioPhotoOnly(row: PortfolioPhotoRow): PortfolioPhoto {
  return {
    id: row.id,
    photoUrl: row.photo_url,
    storagePath: row.storage_path,
    position: row.position,
  };
}

/**
 * Gabungkan satu baris folder dengan foto-fotonya (pemanggil sudah
 * mengelompokkan `photoRows` per `folder_id`, lihat `getPortfolioFolders`
 * di `src/lib/magnative/portfolio-data.ts`) — folder tanpa foto dibiarkan
 * tetap tampil dengan `photos: []` (mis. upload sempat gagal di tengah
 * jalan) daripada disembunyikan seluruhnya.
 */
export function rowToPortfolioFolder(folder: PortfolioFolderRow, photoRows: PortfolioPhotoRow[]): PortfolioFolder {
  return {
    id: folder.id,
    title: folder.title,
    caption: folder.caption ?? undefined,
    createdAt: folder.created_at,
    photos: photoRows
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(rowToPortfolioPhotoOnly),
  };
}

/** Baris `magnative_vendors` (Update Opsional 2, migrasi 0060). */
export type VendorRow = {
  id: string;
  name: string;
  category: VendorCategory;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  catatan: string | null;
};

export function rowToVendor(row: VendorRow): Vendor {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    contactName: row.contact_name ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    catatan: row.catatan ?? undefined,
  };
}

/** Baris `magnative_project_vendors` (Update Opsional 2, migrasi 0060). */
export type ProjectVendorRow = {
  id: string;
  project_id: string;
  vendor_id: string;
  keterangan: string | null;
  biaya_estimasi: number;
};

export function rowToProjectVendor(row: ProjectVendorRow): ProjectVendor {
  return {
    id: row.id,
    projectId: row.project_id,
    vendorId: row.vendor_id,
    keterangan: row.keterangan ?? undefined,
    biayaEstimasi: row.biaya_estimasi,
  };
}

/** Baris `magnative_pipeline_files` (rekomendasi 2 laporan gap-event vs SOP, migrasi 0064). */
export type PipelineFileRow = {
  id: string;
  project_id: string;
  stage: PipelineStage;
  file_name: string;
  file_url: string;
  storage_path: string;
  notes: string | null;
  created_at: string;
};

export function rowToPipelineFile(row: PipelineFileRow): PipelineFile {
  return {
    id: row.id,
    projectId: row.project_id,
    stage: row.stage,
    fileName: row.file_name,
    fileUrl: row.file_url,
    storagePath: row.storage_path,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

/** Baris `magnative_project_tasks` (Update Opsional 2, migrasi 0060). */
export type ProjectTaskRow = {
  id: string;
  project_id: string;
  title: string;
  detail: string | null;
  status: ProjectTaskStatus;
  due_date: string | null;
  pic: string | null;
  sort_order: number;
};

/**
 * `picNameMap` diisi dari `getAssignablePics()` (src/lib/events/data.ts,
 * dipakai ulang) — pola sama seperti `resolvePicNames` di modul Events:
 * query nama staf dipisah dari baris task-nya sendiri karena `pic` sengaja
 * tidak diberi FK literal ke `profiles`.
 */
export function rowToProjectTask(row: ProjectTaskRow, picNameMap: Map<string, string>): ProjectTask {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    detail: row.detail ?? undefined,
    status: row.status,
    dueDate: row.due_date ?? undefined,
    pic: row.pic ?? undefined,
    picName: row.pic ? picNameMap.get(row.pic) : undefined,
    sortOrder: row.sort_order,
  };
}

/** Baris `magnative_asset_comments` (Update Opsional 2, migrasi 0060). */
export type AssetCommentRow = {
  id: string;
  asset_id: string;
  author_name: string;
  comment_text: string;
  is_resolved: boolean;
  created_at: string;
};

export function rowToAssetComment(row: AssetCommentRow): AssetComment {
  return {
    id: row.id,
    assetId: row.asset_id,
    authorName: row.author_name,
    commentText: row.comment_text,
    isResolved: row.is_resolved,
    createdAt: row.created_at,
  };
}
