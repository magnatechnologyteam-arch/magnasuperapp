import type { Invoice, InvoiceDivision, InvoiceItem, InvoiceSourceType, InvoiceStatus } from "./types";

/**
 * Bentuk baris mentah dari Supabase (snake_case, sesuai kolom di migrasi
 * 0014) — dipisah dari `actions.ts` karena file itu ber-"use server" dan
 * semua export-nya wajib fungsi async (aturan Next.js).
 */
export type InvoiceRow = {
  id: string;
  invoice_number: string;
  division: InvoiceDivision;
  source_type: InvoiceSourceType | null;
  source_id: string | null;
  client_name: string;
  client_phone: string | null;
  // supabase-js mengembalikan kolom jsonb sudah ter-parse jadi objek JS.
  items: Array<{ description: string; qty: number; unit_price: number; subtotal: number }>;
  subtotal: number;
  total: number;
  status: InvoiceStatus;
  issued_date: string;
  due_date: string | null;
  pdf_url: string | null;
  pdf_storage_path: string | null;
  catatan: string | null;
  created_at: string;
};

function rowToInvoiceItem(item: {
  description: string;
  qty: number;
  unit_price: number;
  subtotal: number;
}): InvoiceItem {
  return {
    description: item.description,
    qty: item.qty,
    unitPrice: item.unit_price,
    subtotal: item.subtotal,
  };
}

export function invoiceItemToRow(item: InvoiceItem) {
  return {
    description: item.description,
    qty: item.qty,
    unit_price: item.unitPrice,
    subtotal: item.subtotal,
  };
}

export function rowToInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    division: row.division,
    sourceType: row.source_type ?? undefined,
    sourceId: row.source_id ?? undefined,
    clientName: row.client_name,
    clientPhone: row.client_phone ?? undefined,
    items: (row.items ?? []).map(rowToInvoiceItem),
    subtotal: row.subtotal,
    total: row.total,
    status: row.status,
    issuedDate: row.issued_date,
    dueDate: row.due_date ?? undefined,
    pdfUrl: row.pdf_url ?? undefined,
    pdfStoragePath: row.pdf_storage_path ?? undefined,
    catatan: row.catatan ?? undefined,
    createdAt: row.created_at,
  };
}
