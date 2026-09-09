import { redirect } from "next/navigation";
import { HandCoins } from "lucide-react";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { rowToCapitalRequest, type CapitalRequestRow } from "@/lib/capital-requests/mappers";
import { CapitalRequestManager } from "@/components/admin/CapitalRequestManager";
import { ToastProvider } from "@/components/ui/ToastProvider";

/**
 * "Pengajuan Modal" — HANYA akses penuh (Owner/Finance/Admin), pola sama
 * seperti Faktur/Katalog Produk/Klien Terpadu. Ini sisi PENGAJUAN (dibuat
 * Owner); keputusan Approve/Reject ada di /dashboard/investor/pengajuan-modal
 * (akun investor), lihat migrasi 0019 untuk alasan pemisahan ini.
 */
export default async function PengajuanModalPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.division !== "all") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("capital_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<CapitalRequestRow[]>();

  if (error) console.error("[capital-requests] Gagal memuat pengajuan modal:", error.message);

  const requests = (data ?? []).map(rowToCapitalRequest);

  return (
    <div className="p-4 md:p-8">
      <div className="animate-fade-up flex items-start gap-4">
        <div className="relative shrink-0">
          <span
            className="absolute -inset-1.5 animate-pulse rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 opacity-30 blur-lg"
            aria-hidden
          />
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm">
            <HandCoins className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-500 dark:text-emerald-400">
            Admin
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Pengajuan Modal
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Ajukan perkiraan billing & modal event ke investor sebelum digarap — investor akan dapat notifikasi
            untuk Approve/Reject.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <ToastProvider>
          <CapitalRequestManager requests={requests} />
        </ToastProvider>
      </div>
    </div>
  );
}
