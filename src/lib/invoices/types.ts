export type InvoiceDivision = "magnarent" | "magnative" | "production";

export type InvoiceSourceType = "magnarent_booking" | "magnative_project" | "production_booth";

export type InvoiceStatus = "Draft" | "Terkirim" | "Lunas";

export type InvoiceItem = {
  description: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  division: InvoiceDivision;
  sourceType?: InvoiceSourceType;
  sourceId?: string;
  clientName: string;
  clientPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  total: number;
  status: InvoiceStatus;
  issuedDate: string;
  dueDate?: string;
  pdfUrl?: string;
  pdfStoragePath?: string;
  catatan?: string;
  createdAt: string;
};

/**
 * Satu opsi "sumber" di picker pembuatan invoice — hasil normalisasi booking
 * Magnarent + proyek Magnativ + proyek Production jadi satu bentuk yang
 * sama, mirip `Entry` di src/app/dashboard/admin/keuangan/page.tsx. Dipakai
 * untuk mengisi form invoice otomatis (klien, telepon, deskripsi, harga)
 * saat staf memilih salah satu booking/proyek yang sudah ada.
 */
export type InvoiceSourceOption = {
  sourceType: InvoiceSourceType;
  sourceId: string;
  division: InvoiceDivision;
  label: string;
  clientName: string;
  clientPhone?: string;
  amount: number;
  date: string;
};
