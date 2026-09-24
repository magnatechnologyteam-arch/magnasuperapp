import { getPortalSummaryByToken } from "@/lib/portal/actions";
import { SignatureForm } from "@/components/portal/SignatureForm";
import { formatRupiah } from "@/lib/shared/utils";

/**
 * Halaman portal klien self-service (Bagian 5-A item Tinggi #1, riset
 * kompetitor 24 Sep 2026) -- TANPA login, diakses via link token yang
 * dibagikan staf lewat WhatsApp. Route ini SENGAJA di luar `/dashboard`
 * supaya tidak kena middleware auth (lihat src/middleware.ts). Hanya
 * menampilkan proyeksi data yang aman (lihat `PortalSummary` di
 * src/lib/portal/types.ts) -- bukan seluruh baris tabel internal.
 */
export default async function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getPortalSummaryByToken(token);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Link tidak valid</h1>
          <p className="mt-2 text-sm text-slate-500">
            Link portal ini sudah tidak berlaku, kedaluwarsa, atau dicabut. Silakan hubungi tim Magna Technology untuk
            mendapatkan link baru.
          </p>
        </div>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Magna Technology</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {summary.module === "magnarent" ? `Booking ${summary.clientName}` : summary.projectName}
          </h1>
          <p className="text-sm text-slate-500">Halo, {summary.clientName} — berikut ringkasan untuk Anda.</p>
        </header>

        {summary.module === "magnative" && <MagnativeSummary summary={summary} />}
        {summary.module === "magnarent" && <MagnarentSummary summary={summary} />}
        {summary.module === "production" && <ProductionSummary summary={summary} />}

        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Tanda Tangan Digital</h2>
          <SignatureForm
            token={token}
            defaultDocumentLabel={
              summary.module === "magnative"
                ? "Kontrak Kerjasama"
                : summary.module === "magnarent"
                  ? "Serah Terima Alat"
                  : "Persetujuan Shop Drawing"
            }
            defaultSignerName={summary.clientName}
          />
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
      {label}
    </span>
  );
}

function MagnativeSummary({ summary }: { summary: Extract<import("@/lib/portal/types").PortalSummary, { module: "magnative" }> }) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <StatusBadge label={summary.status} />
        <StatusBadge label={summary.statusPembayaran} />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-slate-400">Jenis Proyek</dt>
          <dd className="font-medium text-slate-800">{summary.eventType}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Tanggal</dt>
          <dd className="font-medium text-slate-800">
            {summary.tanggalMulai} — {summary.tanggalSelesai}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Budget</dt>
          <dd className="font-medium text-slate-800">{formatRupiah(summary.budget)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">DP Diterima</dt>
          <dd className="font-medium text-slate-800">{formatRupiah(summary.dpAmount)}</dd>
        </div>
      </dl>
      {summary.invoices.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-xs font-semibold uppercase text-slate-400">Invoice</h3>
          <ul className="space-y-1.5">
            {summary.invoices.map((inv) => (
              <li key={inv.invoiceNumber} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span>{inv.invoiceNumber}</span>
                <span className="font-medium">{formatRupiah(inv.total)}</span>
                <StatusBadge label={inv.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function MagnarentSummary({ summary }: { summary: Extract<import("@/lib/portal/types").PortalSummary, { module: "magnarent" }> }) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <StatusBadge label={summary.status} />
        <StatusBadge label={summary.statusPembayaran} />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-slate-400">Periode Sewa</dt>
          <dd className="font-medium text-slate-800">
            {summary.tanggalMulai} — {summary.tanggalSelesai}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Jumlah Unit</dt>
          <dd className="font-medium text-slate-800">{summary.jumlahUnit}</dd>
        </div>
      </dl>
      {summary.deliveries.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-xs font-semibold uppercase text-slate-400">Jadwal Pengiriman</h3>
          <ul className="space-y-1.5">
            {summary.deliveries.map((d, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span>{d.stage === "pengiriman" ? "Pengiriman" : "Pengambilan"}</span>
                <span>
                  {d.jadwalTanggal ?? "-"} {d.jadwalJam ?? ""}
                </span>
                <StatusBadge label={d.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ProductionSummary({ summary }: { summary: Extract<import("@/lib/portal/types").PortalSummary, { module: "production" }> }) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <StatusBadge label={summary.status} />
        <StatusBadge label={summary.statusPembayaran} />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-slate-400">Lokasi Acara</dt>
          <dd className="font-medium text-slate-800">{summary.lokasiAcara}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Tanggal Instalasi</dt>
          <dd className="font-medium text-slate-800">{summary.tanggalInstalasi}</dd>
        </div>
      </dl>
      {summary.documents.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-xs font-semibold uppercase text-slate-400">Dokumen Shop Drawing</h3>
          <ul className="space-y-1.5">
            {summary.documents.map((doc, i) => (
              <li key={i}>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg bg-slate-50 px-3 py-2 text-sm text-blue-700 hover:underline"
                >
                  {doc.fileName}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
