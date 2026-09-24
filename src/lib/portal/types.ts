/**
 * Portal klien self-service + e-signature in-house (migrasi 0066) --
 * riset kompetitor 24 Sep 2026 (Bagian 5-A item Tinggi #1 & #2). Dibangun
 * IN-HOUSE (tanpa provider berbayar/API eksternal) sesuai arahan Owner:
 * link "magic token" per proyek/booking yang bisa dibagikan ke klien lewat
 * WhatsApp, dan tanda tangan digital di layar (canvas) + audit trail
 * (timestamp + IP + user agent) sebagai bukti persetujuan.
 *
 * Satu tabel `client_portal_links` dipakai lintas 3 modul (kolom `module`
 * membedakan), begitu juga `document_signatures` -- pola sama seperti
 * modul lain yang polymorphic (mis. `invoices.source_type`/`source_id`).
 */
export type PortalModule = "magnative" | "magnarent" | "production";

export type PortalLink = {
  id: string;
  token: string;
  module: PortalModule;
  entityId: string;
  clientName?: string;
  createdBy?: string;
  createdAt: string;
  expiresAt?: string;
  lastAccessedAt?: string;
  revoked: boolean;
};

export type DocumentSignature = {
  id: string;
  module: PortalModule;
  entityId: string;
  documentLabel: string;
  signerName: string;
  signerRole?: string;
  signatureDataUrl: string;
  signedAt: string;
  ipAddress?: string;
  userAgent?: string;
  portalLinkId?: string;
};

/** Ringkasan data yang AMAN ditampilkan ke klien lewat portal publik --
 * sengaja cuma field yang memang perlu klien lihat, bukan seluruh baris
 * tabel internal (mis. tidak ada `catatan` internal staf, tidak ada biaya
 * per-item vendor). */
export type PortalSummary =
  | {
      module: "magnative";
      projectName: string;
      clientName: string;
      eventType: string;
      tanggalMulai: string;
      tanggalSelesai: string;
      status: string;
      statusPembayaran: string;
      budget: number;
      dpAmount: number;
      invoices: Array<{
        invoiceNumber: string;
        total: number;
        status: string;
        dueDate?: string;
        pdfUrl?: string;
      }>;
      checklistProgress?: { total: number; selesai: number };
    }
  | {
      module: "magnarent";
      bookingId: string;
      clientName: string;
      tanggalMulai: string;
      tanggalSelesai: string;
      jumlahUnit: number;
      status: string;
      statusPembayaran: string;
      dpAmount: number;
      deliveries: Array<{
        stage: string;
        driverName?: string;
        jadwalTanggal?: string;
        jadwalJam?: string;
        status: string;
      }>;
    }
  | {
      module: "production";
      projectName: string;
      clientName: string;
      lokasiAcara: string;
      tanggalMulai: string;
      tanggalInstalasi: string;
      status: string;
      statusPembayaran: string;
      dpAmount: number;
      documents: Array<{ fileName: string; fileUrl: string; fileType?: string }>;
      checklistProgress?: { total: number; selesai: number };
    };
