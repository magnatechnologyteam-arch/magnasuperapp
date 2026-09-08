import type {
  Client,
  ClientStatus,
  ContentPost,
  ContentStatus,
  Platform,
  PaymentStatus,
  Project,
  ProjectStatus,
  ProjectType,
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
  catatan: string | null;
};

export type ContentPostRow = {
  id: string;
  client_id: string | null;
  title: string;
  platform: Platform;
  tanggal_posting: string;
  status: ContentStatus;
  catatan: string | null;
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
    catatan: row.catatan ?? undefined,
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
  };
}
