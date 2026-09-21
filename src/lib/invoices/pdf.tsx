import fs from "fs";
import path from "path";
import { Document, Page, StyleSheet, Text, View, Image, renderToBuffer } from "@react-pdf/renderer";
import { formatDateID, formatRupiah } from "@/lib/shared/utils";
import type { Invoice, InvoiceDivision, InvoiceStatus } from "./types";

/**
 * Update Opsional 1, item 7 — invoice sekarang tampil ATAS NAMA DIVISI yang
 * dipilih (logo + nama + tagline divisi), BUKAN lagi "Magna Technology"
 * (nama induk perusahaan tidak pernah tampil ke klien di invoice manapun).
 * Logo per divisi sudah ada sejak sebelumnya di public/brand/*.png, tinggal
 * dipakai di sini. Tagline diambil dari deskripsi divisi yang sudah
 * dipakai konsisten di tempat lain (mis. kartu menu Dashboard Hub).
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
  invoiceSubtitle: { fontSize: 9, color: "#71717a", textAlign: "right", marginTop: 2 },

  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  metaBlock: { flex: 1, paddingRight: 10 },
  metaLabel: { fontSize: 7.5, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  metaValue: { fontSize: 10, fontWeight: 700 },
  metaLine: { fontSize: 9, color: "#3f3f46", marginTop: 2 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  detailKey: { fontSize: 8.5, color: "#71717a" },
  detailValue: { fontSize: 8.5, fontWeight: 700 },

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
  colQty: { flex: 0.8, textAlign: "right" },
  colPrice: { flex: 1.4, textAlign: "right" },
  colSubtotal: { flex: 1.4, textAlign: "right" },

  totalsBlock: { marginTop: 16, alignItems: "flex-end" },
  totalsRow: { flexDirection: "row", width: 220, justifyContent: "space-between", marginTop: 4 },
  totalsLabel: { fontSize: 9.5, color: "#71717a" },
  totalsValue: { fontSize: 9.5 },
  grandTotalRow: {
    flexDirection: "row",
    width: 220,
    justifyContent: "space-between",
    marginTop: 8,
    backgroundColor: "#18181b",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 3,
  },
  grandTotalLabel: { fontSize: 10.5, fontWeight: 700, color: "#ffffff" },
  grandTotalValue: { fontSize: 10.5, fontWeight: 700, color: "#ffffff" },

  signatureBlock: { marginTop: 36, alignItems: "flex-end" },
  signatureLabel: { fontSize: 9, color: "#71717a" },
  signatureDivision: { fontSize: 9.5, fontWeight: 700, marginTop: 30 },

  footer: { position: "absolute", bottom: 32, left: 40, right: 40, fontSize: 8, color: "#a1a1aa", textAlign: "center" },
});

/**
 * Template invoice — dirender lewat @react-pdf/renderer (bukan HTML-ke-PDF)
 * supaya bisa jalan di Vercel serverless tanpa perlu browser headless
 * (Puppeteer dkk terlalu berat/rewel di lingkungan serverless).
 *
 * Update Opsional 1, item 7 — tata letak diubah mengikuti template invoice
 * yang dikirim pemilik: blok DARI/DITAGIHKAN KEPADA/DETAIL tiga kolom,
 * status berwarna, kotak Catatan bergaris merah, tabel item bernomor, dan
 * bar TOTAL gelap yang menonjol. Field yang di template asli tapi tidak
 * ada padanannya di skema invoice kita (mis. detail jadwal acara, ongkos
 * kirim terpisah, metode pembayaran/rekening bank) SENGAJA tidak
 * dipaksakan masuk — supaya tidak menampilkan data rekaan yang tidak
 * benar ke klien. Kalau field-field itu memang dibutuhkan rutin, itu
 * pekerjaan lanjutan tersendiri (nambah kolom baru di skema invoice).
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
            <Text style={styles.invoiceSubtitle}>{invoice.invoiceNumber}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Dari</Text>
            <Text style={styles.metaValue}>{division.label}</Text>
            <Text style={styles.metaLine}>{division.tagline}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Ditagihkan Kepada</Text>
            <Text style={styles.metaValue}>{invoice.clientName}</Text>
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
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.qty}</Text>
              <Text style={styles.colPrice}>{formatRupiah(item.unitPrice)}</Text>
              <Text style={styles.colSubtotal}>{formatRupiah(item.subtotal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{formatRupiah(invoice.subtotal)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>TOTAL</Text>
            <Text style={styles.grandTotalValue}>{formatRupiah(invoice.total)}</Text>
          </View>
        </View>

        <View style={styles.signatureBlock}>
          <Text style={styles.signatureLabel}>Hormat Kami,</Text>
          <Text style={styles.signatureDivision}>{division.label}</Text>
        </View>

        <Text style={styles.footer}>
          {division.label.toUpperCase()} · {division.tagline} — Invoice ini dibuat otomatis oleh MagnaSuperApp
        </Text>
      </Page>
    </Document>
  );
}

/** Render invoice jadi Buffer PDF — dipakai baik untuk stream download maupun upload ke Storage. */
export async function renderInvoicePdf(invoice: Invoice): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument invoice={invoice} />);
}
