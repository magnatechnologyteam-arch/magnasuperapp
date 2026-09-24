import { getDeliveryTrackingInfo } from "@/lib/magnarent/extras-actions";
import { DriverLocationShareForm } from "@/components/magnarent/DriverLocationShareForm";

const STAGE_LABEL: Record<string, string> = { pengiriman: "Pengiriman", pengambilan: "Pengambilan" };

/**
 * Halaman lacak lokasi sopir publik (Gap laporan Bagian 5-C, live location
 * dispatch berbasis browser geolocation) -- TANPA login, dibuka sopir di
 * HP-nya lewat link yang dibagikan staf dari DeliveryScheduleModal. Route
 * SENGAJA di luar `/dashboard` supaya tidak kena middleware auth (lihat
 * src/middleware.ts), sama pola dengan `/checkin/[token]` & `/portal/[token]`.
 */
export default async function LacakPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const info = await getDeliveryTrackingInfo(token);

  if (!info) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Link tidak valid</h1>
          <p className="mt-2 text-sm text-slate-500">
            Link lacak lokasi ini sudah tidak berlaku. Silakan hubungi tim gudang Magnarent.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Magna Technology — Magnarent</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">{STAGE_LABEL[info.stage] ?? info.stage}</h1>
          <p className="text-sm text-slate-500">{info.clientName}</p>
        </header>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <DriverLocationShareForm token={token} />
        </div>
      </div>
    </div>
  );
}
