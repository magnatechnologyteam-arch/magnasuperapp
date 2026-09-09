import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { formatDateID, formatRupiah } from "@/lib/shared/utils";
import type { Invoice, InvoiceDivision } from "./types";

const DIVISION_LABEL: Record<InvoiceDivision, string> = {
  magnarent: "Magnarent",
  magnative: "Magnativ",
  production: "Production",
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#18181b" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  brand: { fontSize: 18, fontWeight: 700 },
  brandSub: { fontSize: 9, color: "#71717a", marginTop: 2 },
  invoiceTitle: { fontSize: 16, fontWeight: 700, textAlign: "right" },
  invoiceNumber: { fontSize: 10, color: "#71717a", textAlign: "right", marginTop: 2 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  metaBlock: { maxWidth: "48%" },
  metaLabel: { fontSize: 8, color: "#a1a1aa", textTransform: "uppercase", marginBottom: 3 },
  metaValue: { fontSize: 10.5, fontWeight: 700 },
  metaLine: { fontSize: 9.5, color: "#3f3f46", marginTop: 1 },
  table: { borderTopWidth: 1, borderTopColor: "#e4e4e7", borderTopStyle: "solid" },
  tableHeadRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
    borderBottomStyle: "solid",
    paddingVertical: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f4f4f5",
    borderBottomStyle: "solid",
    paddingVertical: 7,
  },
  th: { fontSize: 8.5, color: "#71717a", textTransform: "uppercase" },
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
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
    borderTopStyle: "solid",
  },
  grandTotalLabel: { fontSize: 11, fontWeight: 700 },
  grandTotalValue: { fontSize: 11, fontWeight: 700 },
  notes: { marginTop: 28, fontSize: 9, color: "#52525b" },
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
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>Magna Technology</Text>
            <Text style={styles.brandSub}>{DIVISION_LABEL[invoice.division]}</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Ditagihkan kepada</Text>
            <Text style={styles.metaValue}>{invoice.clientName}</Text>
            {invoice.clientPhone && <Text style={styles.metaLine}>{invoice.clientPhone}</Text>}
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Tanggal Terbit</Text>
            <Text style={styles.metaLine}>{formatDateID(invoice.issuedDate)}</Text>
            {invoice.dueDate && (
              <>
                <Text style={[styles.metaLabel, { marginTop: 8 }]}>Jatuh Tempo</Text>
                <Text style={styles.metaLine}>{formatDateID(invoice.dueDate)}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeadRow}>
            <Text style={[styles.th, styles.colDesc]}>Deskripsi</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colPrice]}>Harga Satuan</Text>
            <Text style={[styles.th, styles.colSubtotal]}>Subtotal</Text>
          </View>
          {invoice.items.map((item, i) => (
            <View style={styles.tableRow} key={i}>
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
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatRupiah(invoice.total)}</Text>
          </View>
        </View>

        {invoice.catatan && (
          <View style={styles.notes}>
            <Text style={styles.metaLabel}>Catatan</Text>
            <Text style={{ marginTop: 3 }}>{invoice.catatan}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Invoice ini dibuat otomatis oleh MagnaSuperApp — Magna Technology · Magnarent · Magnativ · Production
        </Text>
      </Page>
    </Document>
  );
}

/** Render invoice jadi Buffer PDF — dipakai baik untuk stream download maupun upload ke Storage. */
export async function renderInvoicePdf(invoice: Invoice): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument invoice={invoice} />);
}
