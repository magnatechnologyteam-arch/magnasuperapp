import fs from "fs";
import path from "path";
import { Document, Page, StyleSheet, Text, View, Image, renderToBuffer } from "@react-pdf/renderer";
import { formatDateID, formatRupiah } from "@/lib/shared/utils";
import type { Invoice, InvoiceDivision, InvoiceStatus } from "./types";

/**
 * Update Opsional 1, item 7 — invoice tampil ATAS NAMA DIVISI yang dipilih
 * (logo + nama + tagline divisi), BUKAN "Magna Technology" (nama induk
 * perusahaan tidak pernah tampil ke klien di invoice manapun).
 *
 * ROMBAK BERIKUTNYA ("rombak total design invoice, ambil semuanya dari
 * sini serta isi fungsinya juga ditambah sesuaikan dengan invoice ini") —
 * layout diubah total mengikuti PERSIS contoh proforma invoice Magnarent
 * (INV/MGR/2026/09/003) yang dikirim Owner: blok DARI dengan PIC & WA
 * pengirim, DITAGIHKAN KEPADA dengan detail acara, DETAIL tiga kolom
 * lengkap (Tgl Acara/Loading/Durasi/Pengiriman), baris item dengan
 * sub-keterangan, blok totals bertingkat (Subtotal → Ongkos Kirim → TOTAL
 * → Deposit → TOTAL DIBAYARKAN), kotak METODE PEMBAYARAN + peringatan, dan
 * SYARAT & KETENTUAN bernomor. Semua field baru OPSIONAL (lihat
 * src/lib/invoices/types.ts + migrasi 0058) — kalau staf tidak mengisinya,
 * baris/blok terkait otomatis disembunyikan alih-alih menampilkan data
 * kosong/rekaan.
 */
const DIVISION_INFO: Record<InvoiceDivision, { label: string; tagline: string; logo: string }> = {
  magnarent: { label: "Magnarent", tagline: "Sewa Peralatan Event", logo: "magnarent-logo.png" },
  magnative: { label: "Magnativ", tagline: "Event Organizer & Creative Agency", logo: "magnativ-logo.png" },
  production: { label: "Production", tagline: "Produksi Booth & Konstruksi", logo: "production-logo.png" },
};

/**
 * Status invoice dipetakan ke label + warna ala template yang dikirim
 * pemilik (kolom "Status: BELUM LUNAS" berwarna merah) — "Terkirim" di
 * skema kita secara makna sama dengan "sudah dikirim ke klien, belum
 * dibayar", jadi labelnya dipakai sama persis: "BELUM LUNAS".
 */
const STATUS_INFO: Record<InvoiceStatus, { label: string; color: string }> = {
  Draft: { label: "DRAFT", color: "#71717a" },
  Terkirim: { label: "BELUM LUNAS", color: "#dc2626" },
  Lunas: { label: "LUNAS", color: "#16a34a" },
};

/**
 * Baca file logo divisi dari /public/brand langsung dari disk — aman
 * karena route pemanggilnya (`/api/invoices/[id]/pdf`) sudah dipaksa jalan
 * di Node.js runtime (bukan Edge), bukan di browser. Kalau filenya somehow
 * tidak ada, invoice tetap dirender tanpa logo alih-alih gagal total.
 */
function readDivisionLogo(division: InvoiceDivision): Buffer | null {
  try {
    return fs.readFileSync(path.join(process.cwd(), "public", "brand", DIVISION_INFO[division].logo));
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9.5, fontFamily: "Helvetica", color: "#18181b" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 },
  brandRow: { flexDirection: "row", alignItems: "center" },
  logo: { width: 38, height: 38, marginRight: 10, objectFit: "contain" },
  brand: { fontSize: 16, fontWeight: 700 },
  brandSub: { fontSize: 8.5, color: "#71717a", marginTop: 1 },
  invoiceTitle: { fontSize: 18, fontWeight: 700, textAlign: "right" },
  invoiceDocLabel: { fontSize: 8.5, fontWeight: 700, color: "#dc2626", textAlign: "right", marginTop: 2 },
  invoiceSubtitle: { fontSize: 9, color: "#71717a", textAlign: "right", marginTop: 2 },

  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  metaBlock: { flex: 1, paddingRight: 10 },
  metaLabel: { fontSize: 7.5, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  metaValue: { fontSize: 10, fontWeight: 700 },
  metaLine: { fontSize: 9, color: "#3f3f46", marginTop: 2 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  detailKey: { fontSize: 8.5, color: "#71717a" },
  detailValue: { fontSize: 8.5, fontWeight: 700, textAlign: "right" },

  noteBox: {
    backgroundColor: "#fef2f2",
    borderLeftWidth: 3,
    borderLeftColor: "#dc2626",
    borderLeftStyle: "solid",
    borderRadius: 3,
    padding: 9,
    marginBottom: 16,
  },
  noteLabel: { fontWeight: 700 },
  noteText: { fontSize: 8.5, color: "#3f3f46", lineHeight: 1.4 },

  table: { borderTopWidth: 1, borderTopColor: "#e4e4e7", borderTopStyle: "solid" },
  tableHeadRow: { flexDirection: "row", backgroundColor: "#18181b", paddingVertical: 6, paddingHorizontal: 4 },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f4f4f5",
    borderBottomStyle: "solid",
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  th: { fontSize: 8, color: "#ffffff", textTransform: "uppercase", fontWeight: 700 },
  colNo: { flex: 0.4 },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.3, textAlign: "right" },
  colSubtotal: { flex: 1.3, textAlign: "right" },
  itemNote: { fontSize: 7.5, color: "#a1a1aa", marginTop: 2 },
  priceUnitLabel: { fontSize: 7, color: "#a1a1aa" },

  totalsBlock: { marginTop: 16, alignItems: "flex-end" },
  totalsRow: { flexDirection: "row", width: 240, justifyContent: "space-between", marginTop: 4 },
  totalsLabel: { fontSize: 9.5, color: "#71717a" },
  totalsValue: { fontSize: 9.5 },
  depositLabel: { fontSize: 9.5, color: "#dc2626" },
  depositValue: { fontSize: 9.5, fontWeight: 700, color: "#dc2626" },
  grandTotalRow: {
    flexDirection: "row",
    width: 240,
    justifyContent: "space-between",
    marginTop: 8,
    backgroundColor: "#18181b",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 3,
  },
  grandTotalLabel: { fontSize: 10.5, fontWeight: 700, color: "#ffffff" },
  grandTotalValue: { fontSize: 10.5, fontWeight: 700, color: "#ffffff" },

  paymentRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 18, gap: 14 },
  paymentBox: {
    flex: 1,
    borderLeftWidth: 3,
    borderLeftColor: "#18181b",
    borderLeftStyle: "solid",
    backgroundColor: "#fafafa",
    borderRadius: 3,
    padding: 10,
  },
  paymentBoxLabel: { fontSize: 7.5, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 },
  paymentBankName: { fontSize: 10, fontWeight: 700 },
  paymentLine: { fontSize: 8.5, color: "#3f3f46", marginTop: 2 },
  warnBox: {
    flex: 1,
    backgroundColor: "#fffbeb",
    borderLeftWidth: 3,
    borderLeftColor: "#d97706",
    borderLeftStyle: "solid",
    borderRadius: 3,
    padding: 10,
  },
  warnText: { fontSize: 8, color: "#78350f", lineHeight: 1.4 },

  signatureBlock: { marginTop: 26, alignItems: "flex-end" },
  signatureLabel: { fontSize: 9, color: "#71717a" },
  signatureDivision: { fontSize: 9.5, fontWeight: 700, marginTop: 30 },
  signaturePic: { fontSize: 9, fontWeight: 700, marginTop: 2 },

  termsBlock: { marginTop: 18 },
  termsTitle: { fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 },
  termsRow: { flexDirection: "row", marginTop: 3 },
  termsNo: { fontSize: 8, color: "#71717a", width: 14 },
  termsText: { fontSize: 8, color: "#3f3f46", flex: 1, lineHeight: 1.4 },

  footer: { position: "absolute", bottom: 32, left: 40, right: 40, fontSize: 8, color: "#a1a1aa", textAlign: "center" },
});

/**
 * Template invoice — dirender lewat @react-pdf/renderer (bukan HTML-ke-PDF)
 * supaya bisa jalan di Vercel serverless tanpa perlu browser headless
 * (Puppeteer dkk terlalu berat/rewel di lingkungan serverless).
 *
 * Dipakai dari dua tempat dengan tujuan berbeda (lihat `renderInvoicePdf`
 * di bawah): stream langsung untuk tombol "Download PDF", atau di-upload ke
 * Supabase Storage dulu untuk dapat URL publik sebelum dikirim ke webhook
 * n8n (tombol "Kirim WA").
 */
function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const division = DIVISION_INFO[invoice.division];
  const status = STATUS_INFO[invoice.status];
  const logoBuffer = readDivisionLogo(invoice.division);
  const totalDibayarkan = invoice.total + (invoice.depositAmount || 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            {logoBuffer && <Image src={{ data: logoBuffer, format: "png" }} style={styles.logo} />}
            <View>
              <Text style={styles.brand}>{division.label}</Text>
              <Text style={styles.brandSub}>{division.tagline}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            {invoice.documentLabel && <Text style={styles.invoiceDocLabel}>{invoice.documentLabel}</Text>}
            <Text style={styles.invoiceSubtitle}>{invoice.invoiceNumber}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Dari</Text>
            <Text style={styles.metaValue}>{division.label}</Text>
            {invoice.picName && <Text style={styles.metaLine}>a.n. {invoice.picName}</Text>}
            {invoice.picPhone && <Text style={styles.metaLine}>WA: {invoice.picPhone}</Text>}
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Ditagihkan Kepada</Text>
            <Text style={styles.metaValue}>{invoice.clientName}</Text>
            {invoice.eventName && <Text style={styles.metaLine}>Event: {invoice.eventName}</Text>}
            {invoice.eventLocation && <Text style={styles.metaLine}>{invoice.eventLocation}</Text>}
            {invoice.clientPhone && <Text style={styles.metaLine}>{invoice.clientPhone}</Text>}
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Detail</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>No.</Text>
              <Text style={styles.detailValue}>{invoice.invoiceNumber}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Tanggal</Text>
              <Text style={styles.detailValue}>{formatDateID(invoice.issuedDate)}</Text>
            </View>
            {invoice.eventDateLabel && (
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Tgl Acara</Text>
                <Text style={styles.detailValue}>{invoice.eventDateLabel}</Text>
              </View>
            )}
            {invoice.loadingInfo && (
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Loading</Text>
                <Text style={styles.detailValue}>{invoice.loadingInfo}</Text>
              </View>
            )}
            {invoice.durationLabel && (
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Durasi</Text>
                <Text style={styles.detailValue}>{invoice.durationLabel}</Text>
              </View>
            )}
            {invoice.deliveryMethod && (
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Pengiriman</Text>
                <Text style={styles.detailValue}>{invoice.deliveryMethod}</Text>
              </View>
            )}
            {invoice.dueDate && (
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Jatuh Tempo</Text>
                <Text style={styles.detailValue}>{formatDateID(invoice.dueDate)}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Status</Text>
              <Text style={[styles.detailValue, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
        </View>

        {invoice.catatan && (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              <Text style={styles.noteLabel}>Catatan: </Text>
              {invoice.catatan}
            </Text>
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.tableHeadRow}>
            <Text style={[styles.th, styles.colNo]}>No</Text>
            <Text style={[styles.th, styles.colDesc]}>Deskripsi</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colPrice]}>Harga Satuan</Text>
            <Text style={[styles.th, styles.colSubtotal]}>Subtotal</Text>
          </View>
          {invoice.items.map((item, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.colNo}>{i + 1}</Text>
              <View style={styles.colDesc}>
                <Text>{item.description}</Text>
                {item.note && <Text style={styles.itemNote}>{item.note}</Text>}
              </View>
              <Text style={styles.colQty}>{item.qtyLabel || item.qty}</Text>
              <View style={styles.colPrice}>
                <Text>{formatRupiah(item.unitPrice)}</Text>
                {item.unitLabel && <Text style={styles.priceUnitLabel}>/{item.unitLabel}</Text>}
              </View>
              <Text style={styles.colSubtotal}>{formatRupiah(item.subtotal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{formatRupiah(invoice.subtotal)}</Text>
          </View>
          {invoice.shippingCost > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>
                Ongkos Kirim{invoice.deliveryMethod ? ` ${invoice.deliveryMethod}` : ""}
              </Text>
              <Text style={styles.totalsValue}>{formatRupiah(invoice.shippingCost)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>TOTAL</Text>
            <Text style={styles.grandTotalValue}>{formatRupiah(invoice.total)}</Text>
          </View>
          {invoice.depositAmount > 0 && (
            <>
              <View style={styles.totalsRow}>
                <Text style={styles.depositLabel}>{invoice.depositLabel || "Deposit"}</Text>
                <Text style={styles.depositValue}>{formatRupiah(invoice.depositAmount)}</Text>
              </View>
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>TOTAL DIBAYARKAN</Text>
                <Text style={styles.grandTotalValue}>{formatRupiah(totalDibayarkan)}</Text>
              </View>
            </>
          )}
        </View>

        {(invoice.bankName || invoice.paymentNote) && (
          <View style={styles.paymentRow}>
            {invoice.bankName && (
              <View style={styles.paymentBox}>
                <Text style={styles.paymentBoxLabel}>Metode Pembayaran</Text>
                <Text style={styles.paymentBankName}>{invoice.bankName}</Text>
                {invoice.bankAccountHolder && <Text style={styles.paymentLine}>a.n. {invoice.bankAccountHolder}</Text>}
                {invoice.bankAccountNumber && (
                  <Text style={styles.paymentLine}>No. Rek: {invoice.bankAccountNumber}</Text>
                )}
              </View>
            )}
            {invoice.paymentNote && (
              <View style={styles.warnBox}>
                <Text style={styles.warnText}>⚠ {invoice.paymentNote}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.signatureBlock}>
          <Text style={styles.signatureLabel}>Hormat Kami,</Text>
          <Text style={styles.signatureDivision}>{division.label}</Text>
          {invoice.picName && <Text style={styles.signaturePic}>{invoice.picName}</Text>}
        </View>

        {invoice.termsConditions && (
          <View style={styles.termsBlock}>
            <Text style={styles.termsTitle}>Syarat &amp; Ketentuan</Text>
            {invoice.termsConditions
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line, i) => (
                <View style={styles.termsRow} key={i}>
                  <Text style={styles.termsNo}>{i + 1}.</Text>
                  <Text style={styles.termsText}>{line}</Text>
                </View>
              ))}
          </View>
        )}

        <Text style={styles.footer}>
          {division.label.toUpperCase()} · {division.tagline}
          {invoice.picPhone ? ` · WA ${invoice.picPhone}` : ""} — Invoice ini dibuat otomatis oleh MagnaSuperApp
        </Text>
      </Page>
    </Document>
  );
}

/** Render invoice jadi Buffer PDF — dipakai baik untuk stream download maupun upload ke Storage. */
export async function renderInvoicePdf(invoice: Invoice): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument invoice={invoice} />);
}
