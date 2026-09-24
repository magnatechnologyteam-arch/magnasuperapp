import { getCheckinLinkInfo } from "@/lib/magnative/actions";
import { CheckinForm } from "@/components/magnative/CheckinForm";

/**
 * Halaman check-in publik (rekomendasi Bagian 5-B #10 laporan riset
 * kompetitor 24 Sep 2026) -- TANPA login, diakses tamu lewat scan QR yang
 * dicetak/ditampilkan staf di venue. Route SENGAJA di luar `/dashboard`
 * supaya tidak kena middleware auth (lihat src/middleware.ts), sama
 * seperti pola `/portal/[token]`.
 */
export default async function CheckinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const info = await getCheckinLinkInfo(token);

  if (!info) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Link tidak valid</h1>
          <p className="mt-2 text-sm text-slate-500">
            Link check-in ini sudah tidak berlaku atau dihapus. Silakan hubungi panitia di lokasi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Magna Technology</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">{info.projectName}</h1>
          {info.label && <p className="text-sm text-slate-500">{info.label}</p>}
        </header>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <CheckinForm token={token} />
        </div>
      </div>
    </div>
  );
}
