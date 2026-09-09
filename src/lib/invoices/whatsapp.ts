/**
 * Normalisasi nomor telepon Indonesia ke format "62..." yang dipakai
 * WhatsApp (GOWA) — logikanya sama seperti yang sudah dipakai di n8n
 * workflow WhatsApp bot Magnarent: prefix lokal "0" diganti kode negara
 * "62", spasi/strip/tanda kurung dibuang.
 *
 * Mengembalikan `null` kalau nomornya kosong atau jelas tidak valid (kurang
 * dari 8 digit setelah dibersihkan), supaya pemanggil bisa menampilkan
 * pesan yang jelas ("nomor WA klien belum diisi") daripada mengirim ke
 * nomor yang salah.
 */
export function formatPhoneID(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9+]/g, "").replace(/^\+/, "");
  if (digits.length < 8) return null;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  // Nomor tanpa prefix "0" atau "62" sama sekali (mis. staf ketik "812...")
  // — anggap nomor lokal Indonesia tanpa "0" di depan.
  return `62${digits}`;
}

export type InvoiceWebhookInput = {
  phone: string;
  clientName: string;
  invoiceNumber: string;
  pdfUrl: string;
  total: number;
};

export type InvoiceWebhookResult = { ok: true } | { ok: false; error: string };

/**
 * Trigger webhook n8n yang sudah ada untuk WhatsApp bot Magnarent (dengan
 * GOWA di jaringan lokal kantor) supaya PDF invoice dikirim ke WhatsApp
 * klien. MagnaSuperApp (di Vercel) TIDAK bisa langsung memanggil GOWA
 * (alamatnya lokal, `192.168.1.20`, tidak bisa diakses dari internet) — jadi
 * cuma memanggil webhook publik n8n, dan n8n yang meneruskan ke GOWA lewat
 * jaringan kantornya sendiri. Sama pola dengan sub-workflow pengiriman PDF
 * quotation yang sudah berjalan di sana.
 *
 * `N8N_INVOICE_WEBHOOK_URL` wajib diset di environment variables (URL
 * webhook n8n-nya) — kalau belum diset, fungsi ini gagal dengan pesan yang
 * jelas daripada diam-diam tidak melakukan apa-apa.
 */
export async function triggerInvoiceWhatsAppWebhook(input: InvoiceWebhookInput): Promise<InvoiceWebhookResult> {
  const webhookUrl = process.env.N8N_INVOICE_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("[invoices] N8N_INVOICE_WEBHOOK_URL belum diset di environment variables.");
    return { ok: false, error: "Fitur kirim WA belum dikonfigurasi (N8N_INVOICE_WEBHOOK_URL belum diset)." };
  }

  const phone = formatPhoneID(input.phone);
  if (!phone) {
    return { ok: false, error: "Nomor WhatsApp klien tidak valid atau belum diisi." };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Secret bersama opsional — kalau diset, n8n bisa memverifikasi
        // request ini benar dari MagnaSuperApp lewat header ini (webhook
        // n8n publik biasanya tidak punya otentikasi bawaan).
        ...(process.env.N8N_INVOICE_WEBHOOK_SECRET
          ? { "x-webhook-secret": process.env.N8N_INVOICE_WEBHOOK_SECRET }
          : {}),
      },
      body: JSON.stringify({
        phone,
        client_name: input.clientName,
        invoice_number: input.invoiceNumber,
        pdf_url: input.pdfUrl,
        total: input.total,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[invoices] Webhook n8n mengembalikan status gagal:", res.status, body);
      return { ok: false, error: `Webhook n8n menolak request (status ${res.status}).` };
    }

    return { ok: true };
  } catch (err) {
    console.error("[invoices] Gagal memanggil webhook n8n:", err instanceof Error ? err.message : err);
    return { ok: false, error: "Gagal menghubungi webhook n8n — cek koneksi/URL webhook-nya." };
  }
}
