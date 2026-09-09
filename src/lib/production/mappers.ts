import type {
  BoothProject,
  BoothStatus,
  MaterialCategory,
  MaterialItem,
  MaterialUnit,
  MaterialUsage,
  PaymentStatus,
  PurchaseOrder,
  PurchaseOrderStatus,
} from "./types";

/**
 * Bentuk baris mentah dari Supabase (snake_case, sesuai kolom di migrasi
 * 0006) — dipisah dari `actions.ts` karena file itu ber-"use server" dan
 * semua export-nya wajib fungsi async (aturan Next.js).
 */
export type MaterialRow = {
  id: string;
  name: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  location: string;
  stock: number;
  min_stock: number;
  price_per_unit: number;
};

export type BoothProjectRow = {
  id: string;
  name: string;
  client_id: string | null;
  nama_klien: string;
  lokasi_acara: string;
  status: BoothStatus;
  tanggal_mulai: string;
  tanggal_instalasi: string;
  budget: number;
  status_pembayaran: PaymentStatus;
  dp_amount: number;
  // supabase-js mengembalikan kolom jsonb sudah ter-parse jadi objek JS.
  materials: MaterialUsage[];
  catatan: string | null;
};

export function rowToMaterial(row: MaterialRow): MaterialItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    location: row.location,
    stock: row.stock,
    minStock: row.min_stock,
    pricePerUnit: row.price_per_unit,
  };
}

export type PurchaseOrderRow = {
  id: string;
  material_id: string | null;
  supplier_name: string;
  qty: number;
  unit_price: number;
  status: PurchaseOrderStatus;
  order_date: string;
  expected_date: string | null;
  received_date: string | null;
  catatan: string | null;
};

export function rowToPurchaseOrder(row: PurchaseOrderRow): PurchaseOrder {
  return {
    id: row.id,
    materialId: row.material_id ?? undefined,
    supplierName: row.supplier_name,
    qty: row.qty,
    unitPrice: row.unit_price,
    status: row.status,
    orderDate: row.order_date,
    expectedDate: row.expected_date ?? undefined,
    receivedDate: row.received_date ?? undefined,
    catatan: row.catatan ?? undefined,
  };
}

export function rowToBoothProject(row: BoothProjectRow): BoothProject {
  return {
    id: row.id,
    name: row.name,
    clientId: row.client_id ?? undefined,
    namaKlien: row.nama_klien,
    lokasiAcara: row.lokasi_acara,
    status: row.status,
    tanggalMulai: row.tanggal_mulai,
    tanggalInstalasi: row.tanggal_instalasi,
    budget: row.budget,
    statusPembayaran: row.status_pembayaran,
    dpAmount: row.dp_amount ?? 0,
    materials: row.materials ?? [],
    catatan: row.catatan ?? undefined,
  };
}
