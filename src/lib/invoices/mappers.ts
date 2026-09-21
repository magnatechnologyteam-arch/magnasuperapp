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
  document_label: string | null;
  pic_name: string | null;
  pic_phone: string | null;
  client_name: string;
  client_phone: string | null;
  event_name: string | null;
  event_location: string | null;
  event_date_label: string | null;
  loading_info: string | null;
  duration_label: string | null;
  delivery_method: string | null;
  // supabase-js mengembalikan kolom jsonb sudah ter-parse jadi objek JS.
  items: Array<{
    description: string;
    qty: number;
    unit_price: number;
    subtotal: number;
    qty_label?: string | null;
    unit_label?: string | null;
    note?: string | null;
  }>;
  subtotal: number;
  shipping_cost: number;
  total: number;
  deposit_amount: number;
  deposit_label: string | null;
  bank_name: string | null;
  bank_account_holder: string | null;
  bank_account_number: string | null;
  payment_note: string | null;
  terms_conditions: string | null;
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
  qty_label?: string | null;
  unit_label?: string | null;
  note?: string | null;
}): InvoiceItem {
  return {
    description: item.description,
    qty: item.qty,
    unitPrice: item.unit_price,
    subtotal: item.subtotal,
    qtyLabel: item.qty_label ?? undefined,
    unitLabel: item.unit_label ?? undefined,
    note: item.note ?? undefined,
  };
}

export function invoiceItemToRow(item: InvoiceItem) {
  return {
    description: item.description,
    qty: item.qty,
    unit_price: item.unitPrice,
    subtotal: item.subtotal,
    qty_label: item.qtyLabel ?? null,
    unit_label: item.unitLabel ?? null,
    note: item.note ?? null,
  };
}

export function rowToInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    division: row.division,
    sourceType: row.source_type ?? undefined,
    sourceId: row.source_id ?? undefined,
    documentLabel: row.document_label ?? undefined,
    picName: row.pic_name ?? undefined,
    picPhone: row.pic_phone ?? undefined,
    clientName: row.client_name,
    clientPhone: row.client_phone ?? undefined,
    eventName: row.event_name ?? undefined,
    eventLocation: row.event_location ?? undefined,
    eventDateLabel: row.event_date_label ?? undefined,
    loadingInfo: row.loading_info ?? undefined,
    durationLabel: row.duration_label ?? undefined,
    deliveryMethod: row.delivery_method ?? undefined,
    items: (row.items ?? []).map(rowToInvoiceItem),
    subtotal: row.subtotal,
    shippingCost: row.shipping_cost ?? 0,
    total: row.total,
    depositAmount: row.deposit_amount ?? 0,
    depositLabel: row.deposit_label ?? undefined,
    bankName: row.bank_name ?? undefined,
    bankAccountHolder: row.bank_account_holder ?? undefined,
    bankAccountNumber: row.bank_account_number ?? undefined,
    paymentNote: row.payment_note ?? undefined,
    termsConditions: row.terms_conditions ?? undefined,
    status: row.status,
    issuedDate: row.issued_date,
    dueDate: row.due_date ?? undefined,
    pdfUrl: row.pdf_url ?? undefined,
    pdfStoragePath: row.pdf_storage_path ?? undefined,
    catatan: row.catatan ?? undefined,
    createdAt: row.created_at,
  };
}
