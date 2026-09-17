import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getCashFlowStatement, DIVISION_LABELS } from "@/lib/accounting/data";
import { formatRupiah, formatDateID, todayISO } from "@/lib/shared/utils";

/**
 * Laporan Arus Kas (Tahap E modul "Akuntansi") -- HANYA akses penuh.
 * BEDA dari halaman "Arus Kas Proyek" (/dashboard/admin/arus-kas) yang
 * sudah ada lebih dulu: itu hitung ulang langsung dari event_expenses/
 * invoices per proyek; ini laporan resmi akuntansi berbasis Jurnal Umum
 * (journal_entries/journal_entry_lines) -- mutasi Kas Kecil + Bank
 * Operasional yang sudah diposting Tahap A/B, dipecah Operasional/
 * Investasi/Pendanaan seperti Laporan Arus Kas standar. Lihat komentar
 * panjang di `getCashFlowStatement` (src/lib/accounting/data.ts) untuk
 * aturan klasifikasinya.
 */
export default async function ArusKasAkuntansiPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile || profile.division !== "all") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const today = todayISO();
  const defaultStart = `${today.slice(0, 7)}-01`;
  const startDate = params.start || defaultStart;
  const endDate = params.end || today;

  const report = await getCashFlowStatement(startDate, endDate);
  const isNaik = report.netChange >= 0;

  return (
    <div className="p-4 md:p-8">
      <div className="animate-fade-up flex items-start gap-4">
        <div className="relative shrink-0">
          <span
            className="absolute -inset-1.5 animate-pulse rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 opacity-30 blur-lg"
            aria-hidden
          />
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-sm">
            <Wallet className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-500 dark:text-sky-400">
            Admin — Akuntansi
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Arus Kas</h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Mutasi Kas Kecil dan Bank Operasional, ditarik langsung dari Jurnal Umum dan dipecah per aktivitas
            Operasional, Investasi, dan Pendanaan.
          </p>
        </div>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <label htmlFor="start" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Dari tanggal
          </label>
          <input
            id="start"
            name="start"
            type="date"
            defaultValue={startDate}
            className="mt-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="end" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Sampai tanggal
          </label>
          <input
            id="end"
            name="end"
            type="date"
            defaultValue={endDate}
            className="mt-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-sky-700"
        >
          Tampilkan
        </button>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Saldo Awal</p>
          <p className="mt-1.5 text-xl font-bold text-zinc-900 dark:text-white">{formatRupiah(report.saldoAwal)}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Kas Masuk</p>
          <p className="mt-1.5 text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatRupiah(report.totalMasuk)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Kas Keluar</p>
          <p className="mt-1.5 text-xl font-bold text-rose-600 dark:text-rose-400">
            {formatRupiah(report.totalKeluar)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Saldo Akhir</p>
          <p
            className={`mt-1.5 text-xl font-bold ${isNaik ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
          >
            {formatRupiah(report.saldoAkhir)}
          </p>
        </div>
      </div>

      {report.entryCount === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Belum ada mutasi kas/bank pada rentang tanggal ini -- coba perlebar rentang tanggal di atas.
        </p>
      ) : (
        <>
          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Per Aktivitas</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    <th className="pb-2 font-medium">Aktivitas</th>
                    <th className="pb-2 text-right font-medium">Kas Masuk</th>
                    <th className="pb-2 text-right font-medium">Kas Keluar</th>
                    <th className="pb-2 text-right font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byCategory.map((row) => (
                    <tr key={row.category} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="py-2 text-zinc-600 dark:text-zinc-300">{row.category}</td>
                      <td className="py-2 text-right text-emerald-600 dark:text-emerald-400">
                        {formatRupiah(row.totalMasuk)}
                      </td>
                      <td className="py-2 text-right text-rose-600 dark:text-rose-400">
                        {formatRupiah(row.totalKeluar)}
                      </td>
                      <td
                        className={`py-2 text-right font-semibold ${row.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                      >
                        {formatRupiah(row.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-zinc-300 dark:border-zinc-700">
                    <td className="py-2 font-bold text-zinc-900 dark:text-white">Total Perubahan Kas</td>
                    <td className="py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatRupiah(report.totalMasuk)}
                    </td>
                    <td className="py-2 text-right font-bold text-rose-600 dark:text-rose-400">
                      {formatRupiah(report.totalKeluar)}
                    </td>
                    <td
                      className={`py-2 text-right font-bold ${isNaik ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                    >
                      {formatRupiah(report.netChange)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Rincian Mutasi</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    <th className="pb-2 font-medium">Tanggal</th>
                    <th className="pb-2 font-medium">Keterangan</th>
                    <th className="pb-2 font-medium">Akun</th>
                    <th className="pb-2 font-medium">Lawan Akun</th>
                    <th className="pb-2 font-medium">Divisi</th>
                    <th className="pb-2 font-medium">Aktivitas</th>
                    <th className="pb-2 text-right font-medium">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {report.lines.map((line, idx) => (
                    <tr
                      key={`${line.entryId}-${line.cashAccountCode}-${idx}`}
                      className="border-t border-zinc-100 dark:border-zinc-800"
                    >
                      <td className="py-2 pr-2 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                        {formatDateID(line.entryDate)}
                      </td>
                      <td className="py-2 pr-2 text-zinc-600 dark:text-zinc-300">{line.description}</td>
                      <td className="py-2 pr-2 whitespace-nowrap text-zinc-600 dark:text-zinc-300">
                        {line.cashAccountName}
                      </td>
                      <td className="py-2 pr-2 whitespace-nowrap text-zinc-600 dark:text-zinc-300">
                        {line.counterAccountName}
                      </td>
                      <td className="py-2 pr-2 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                        {DIVISION_LABELS[line.division] ?? line.division}
                      </td>
                      <td className="py-2 pr-2 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                        {line.category}
                      </td>
                      <td
                        className={`py-2 text-right font-medium whitespace-nowrap ${line.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                      >
                        {line.amount >= 0 ? "+" : "-"}
                        {formatRupiah(Math.abs(line.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
