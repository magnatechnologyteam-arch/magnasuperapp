import { redirect } from "next/navigation";
import { BookOpenText } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getChartOfAccounts, getManualJournalEntries } from "@/lib/accounting/data";
import { ChartOfAccountsManager } from "@/components/accounting/ChartOfAccountsManager";
import { ManualJournalManager } from "@/components/accounting/ManualJournalManager";
import { ToastProvider } from "@/components/ui/ToastProvider";

/**
 * Halaman "Akuntansi" (Tahap F) -- HANYA akses penuh, sama seperti Laba-
 * Rugi/Neraca/Arus Kas. SENGAJA menyatukan dua alat kelola (Daftar Akun +
 * Jurnal Manual) jadi SATU halaman/satu tautan navigasi, bukan dua
 * halaman terpisah seperti Laba-Rugi/Neraca/Arus Kas (Tahap C/D/E) --
 * ketiga laporan itu masing-masing sudah besar dengan filter tanggal
 * sendiri, sedangkan Daftar Akun & Jurnal Manual sama-sama alat
 * "input/kelola" berukuran pas kalau digabung, supaya menu Admin tidak
 * makin panjang tiap modul Akuntansi nambah satu bagian baru.
 *
 * Data akun & jurnal manual sengaja diambil sekali di sini (Server
 * Component) lalu dioper sebagai props ke dua Client Component terpisah
 * (ChartOfAccountsManager, ManualJournalManager) -- form Jurnal Manual
 * butuh daftar akun AKTIF untuk pilihan baris debit/kredit, jadi
 * `accounts` dioper ke keduanya.
 */
export default async function AkuntansiPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.division !== "all") {
    redirect("/dashboard");
  }

  const [accounts, manualEntries] = await Promise.all([getChartOfAccounts(), getManualJournalEntries()]);

  return (
    <div className="p-4 md:p-8">
      <div className="animate-fade-up flex items-start gap-4">
        <div className="relative shrink-0">
          <span
            className="absolute -inset-1.5 animate-pulse rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 opacity-30 blur-lg"
            aria-hidden
          />
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
            <BookOpenText className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-500 dark:text-violet-400">
            Admin — Akuntansi
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Akuntansi</h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Kelola Daftar Akun dan catat jurnal manual untuk transaksi di luar Faktur/Realisasi Event -- sumber data
            untuk Laba-Rugi, Neraca, dan Arus Kas.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <ToastProvider>
          <ChartOfAccountsManager initialAccounts={accounts} />
          <ManualJournalManager initialEntries={manualEntries} accounts={accounts} />
        </ToastProvider>
      </div>
    </div>
  );
}
