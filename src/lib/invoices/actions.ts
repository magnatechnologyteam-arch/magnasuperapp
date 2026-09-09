"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";
import { invoiceItemToRow, rowToInvoice, type InvoiceRow } from "./mappers";
import { renderInvoicePdf } from "./pdf";
import { triggerInvoiceWhatsAppWebhook } from "./whatsapp";
import type { Invoice, InvoiceDivision, InvoiceSourceType, InvoiceStatus } from "./types";

const MODULE_PATH = "/dashboard/admin/faktur";
const GENERIC_ERROR = "Terjadi kesalahan, coba lagi.";
const PDF_BUCKET = "invoice-pdfs";
const VALID_DIVISIONS: InvoiceDivision[] = ["magnarent", "magnative", "production"];
const VALID_STATUSES: InvoiceStatus[] = ["Draft", "Terkirim", "Lunas"];

export type MutationResult = { ok: true } | { ok: false; error: string };
export type CreateResult = { ok: true; id: string } | { ok: false; error: string };

export type InvoiceItemInput = { description: string; qty: number; unitPrice: number };

export type InvoiceFormInput = {
  division: InvoiceDivision;
  sourceType?: InvoiceSourceType;
  sourceId?: string;
  clientName: string;
  clientPhone?: string;
  items: InvoiceItemInput[];
  issuedDate?: string;
  dueDate?: string;
  catatan?: string;
};

/**
 * Validasi + hitung ulang subtotal/total DI SERVER dari `items` yang
 * dikirim klien — jangan percaya subtotal/total yang (mungkin) dihitung di
 * browser, supaya angka di invoice yang tersimpan selalu konsisten dengan
 * baris item-nya sendiri.
 */
function buildItemRows(items: InvoiceItemInput[]): { rows: ReturnType<typeof invoiceItemToRow>[]; total: number } | null {
  if (!Array.isArray(items) || items.length === 0) return null;

  const rows: ReturnType<typeof invoiceItemToRow>[] = [];
  let total = 0;
  for (const item of items) {
    const description = item.description?.trim();
    const qty = Number(item.qty);
    const unitPrice = Number(item.unitPrice);
    if (!description || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      continue;
    }
    const subtotal = Math.round(qty * unitPrice);
    total += subtotal;
    rows.push(invoiceItemToRow({ description, qty, unitPrice, subtotal }));
  }

  if (rows.length === 0) return null;
  return { rows, total };
}

function validateInvoiceInput(input: InvoiceFormInput): string | null {
  if (!VALID_DIVISIONS.includes(input.division)) return "Divisi tidak valid.";
  if (!input.clientName?.trim()) return "Nama klien wajib diisi.";
  return null;
}

export async function createInvoice(input: InvoiceFormInput): Promise<CreateResult> {
  const validationError = validateInvoiceInput(input);
  if (validationError) return { ok: false, error: validationError };

  const built = buildItemRows(input.items);
  if (!built) return { ok: false, error: "Minimal satu baris item dengan deskripsi, qty, dan harga yang valid." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      division: input.division,
      source_type: input.sourceType ?? null,
      source_id: input.sourceId ?? null,
      client_name: input.clientName.trim(),
      client_phone: input.clientPhone?.trim() || null,
      items: built.rows,
      subtotal: built.total,
      total: built.total,
      issued_date: input.issuedDate || undefined,
      due_date: input.dueDate || null,
      catatan: input.catatan?.trim() || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[invoices] createInvoice gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  void logActivity({ module: "admin", action: "create", entityType: "invoice", entityLabel: input.clientName });
  return { ok: true, id: data.id };
}

export async function updateInvoice(id: string, input: InvoiceFormInput): Promise<MutationResult> {
  const validationError = validateInvoiceInput(input);
  if (validationError) return { ok: false, error: validationError };

  const built = buildItemRows(input.items);
  if (!built) return { ok: false, error: "Minimal satu baris item dengan deskripsi, qty, dan harga yang valid." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({
      division: input.division,
      client_name: input.clientName.trim(),
      client_phone: input.clientPhone?.trim() || null,
      items: built.rows,
      subtotal: built.total,
      total: built.total,
      due_date: input.dueDate || null,
      catatan: input.catatan?.trim() || null,
    })
    .eq("id", id);

  if (error) {
    console.error("[invoices] updateInvoice gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  void logActivity({ module: "admin", action: "update", entityType: "invoice", entityLabel: input.clientName });
  return { ok: true };
}

export async function deleteInvoice(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: invoiceRow } = await supabase
    .from("invoices")
    .select("invoice_number, pdf_storage_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) {
    console.error("[invoices] deleteInvoice gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  if (invoiceRow?.pdf_storage_path) {
    await supabase.storage.from(PDF_BUCKET).remove([invoiceRow.pdf_storage_path]);
  }
  revalidatePath(MODULE_PATH);
  void logActivity({ module: "admin", action: "delete", entityType: "invoice", entityLabel: invoiceRow?.invoice_number });
  return { ok: true };
}

export async function markInvoiceStatus(id: string, status: InvoiceStatus): Promise<MutationResult> {
  if (!VALID_STATUSES.includes(status)) return { ok: false, error: "Status tidak valid." };

  const supabase = await createClient();
  const { data: invoiceRow, error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", id)
    .select("invoice_number")
    .single();

  if (error) {
    console.error("[invoices] markInvoiceStatus gagal:", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(MODULE_PATH);
  void logActivity({
    module: "admin",
    action: "status_change",
    entityType: "invoice",
    entityLabel: invoiceRow?.invoice_number,
    detail: `status → ${status}`,
  });
  return { ok: true };
}

/**
 * Generate ulang PDF invoice, upload ke bucket `invoice-pdfs` (path
 * deterministik `${id}.pdf`, di-upsert supaya versi lama tertimpa kalau
 * invoice-nya diedit lalu dikirim ulang), lalu trigger webhook n8n supaya
 * WhatsApp bot Magnarent yang meneruskan PDF-nya ke GOWA di jaringan kantor.
 * Sukses mengirim otomatis menandai status invoice jadi "Terkirim" (kecuali
 * sudah "Lunas" — tidak boleh mundur ke "Terkirim").
 */
export async function sendInvoiceWhatsApp(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .returns<InvoiceRow[]>()
    .single();

  if (error || !row) {
    console.error("[invoices] sendInvoiceWhatsApp: invoice tidak ditemukan:", error?.message);
    return { ok: false, error: "Invoice tidak ditemukan." };
  }

  const invoice: Invoice = rowToInvoice(row);
  if (!invoice.clientPhone) {
    return { ok: false, error: "Nomor WhatsApp klien belum diisi di invoice ini." };
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderInvoicePdf(invoice);
  } catch (err) {
    console.error("[invoices] Gagal generate PDF:", err instanceof Error ? err.message : err);
    return { ok: false, error: "Gagal membuat file PDF invoice." };
  }

  const storagePath = `${invoice.id}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(PDF_BUCKET)
    .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });
  if (uploadError) {
    console.error("[invoices] Upload PDF gagal:", uploadError.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(PDF_BUCKET).getPublicUrl(storagePath);

  const webhookResult = await triggerInvoiceWhatsAppWebhook({
    phone: invoice.clientPhone,
    clientName: invoice.clientName,
    invoiceNumber: invoice.invoiceNumber,
    pdfUrl: publicUrl,
    total: invoice.total,
  });

  // URL PDF-nya tetap disimpan walau pengiriman webhook gagal — supaya
  // tombol "Download PDF"/percobaan kirim ulang berikutnya tidak perlu
  // generate ulang dari nol, dan staf bisa lihat linknya manual kalau perlu.
  await supabase
    .from("invoices")
    .update({
      pdf_url: publicUrl,
      pdf_storage_path: storagePath,
      ...(webhookResult.ok ? { status: invoice.status === "Lunas" ? "Lunas" : "Terkirim" } : {}),
    })
    .eq("id", id);

  if (!webhookResult.ok) {
    return { ok: false, error: webhookResult.error };
  }

  revalidatePath(MODULE_PATH);
  void logActivity({
    module: "admin",
    action: "status_change",
    entityType: "invoice",
    entityLabel: invoice.invoiceNumber,
    detail: `Dikirim ke WhatsApp ${invoice.clientPhone}`,
  });
  return { ok: true };
}
