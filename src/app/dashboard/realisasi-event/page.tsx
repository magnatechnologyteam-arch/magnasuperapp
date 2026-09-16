import { ReceiptText } from "lucide-react";
import { getEventExpensesPageData } from "@/lib/event-expenses/data";
import { EventExpenseManager } from "@/components/event-expenses/EventExpenseManager";
import { ToastProvider } from "@/components/ui/ToastProvider";

/**
 * Halaman "Realisasi Event" (Tahap B modul baru, migrasi 0049) — pencatatan
 * pengeluaran lintas 3 divisi (Magnarent/Magnative/Production) + Finance/
 * Umum. SENGAJA di luar prefix `/dashboard/admin|magnative|magnarent|
 * production` (lihat src/middleware.ts) supaya staf divisi manapun bisa
 * buka langsung — sama seperti "Katalog Produk" & "Chat" — kecuali Investor
 * (diblokir eksplisit di middleware + RLS `event_expenses`).
 */
export default async function RealisasiEventPage() {
  const { expenses, sourceOptions } = await getEventExpensesPageData();

  return (
    <div className="p-4 md:p-8">
      <div className="animate-fade-up flex items-start gap-4">
        <div className="relative shrink-0">
          <span
            className="absolute -inset-1.5 animate-pulse rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 opacity-30 blur-lg"
            aria-hidden
          />
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm">
            <ReceiptText className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-500 dark:text-violet-400">
            Realisasi
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Realisasi Event
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Catat pengeluaran untuk event/proyek Magnarent, Magnativ, Production, atau operasional Finance —
            lengkap dengan bukti transaksi dan status penggantian dana.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <ToastProvider>
          <EventExpenseManager initialExpenses={expenses} sourceOptions={sourceOptions} />
        </ToastProvider>
      </div>
    </div>
  );
}
