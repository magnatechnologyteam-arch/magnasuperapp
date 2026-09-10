import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { MaintenanceToggleForm } from "@/components/admin/MaintenanceToggleForm";

/**
 * Tahap 29 — saklar banner "Sistem sedang diperbarui". HANYA akses penuh,
 * pola sama seperti halaman admin lain (Katalog Produk, Faktur, dst).
 */
export default async function StatusSistemPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.division !== "all") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("system_status")
    .select("maintenance_active, maintenance_message")
    .eq("id", 1)
    .maybeSingle();

  return (
    <div className="p-4 md:p-8">
      <div className="animate-fade-up flex items-start gap-4">
        <div className="relative shrink-0">
          <span
            className="absolute -inset-1.5 animate-pulse rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 opacity-30 blur-lg"
            aria-hidden
          />
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm">
            <Wrench className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-500 dark:text-amber-400">
            Admin
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Status Sistem
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Nyalakan sebelum melakukan perbaikan/update besar — semua pengguna (semua divisi & investor) akan lihat
            banner pemberitahuan ini di bagian atas aplikasi. Matikan lagi setelah selesai.
          </p>
        </div>
      </div>

      <div className="mt-6 max-w-lg">
        <ToastProvider>
          <MaintenanceToggleForm
            initialActive={data?.maintenance_active ?? false}
            initialMessage={
              data?.maintenance_message ??
              "Sistem sedang diperbarui, mohon tunggu sebentar — beberapa tampilan mungkin sedikit berubah."
            }
          />
        </ToastProvider>
      </div>
    </div>
  );
}
