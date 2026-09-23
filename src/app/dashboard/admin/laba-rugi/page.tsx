import { redirect } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getIncomeStatement } from "@/lib/accounting/data";
import { formatRupiah, todayISO } from "@/lib/shared/utils";

/**
 * Laporan Laba-Rugi (Tahap C modul "Akuntansi") -- HANYA akses penuh,
 * pola sama seperti Keuangan/Faktur/Laporan. BEDA MENDASAR dari halaman
 * "Keuangan" (Piutang & Pendapatan) yang sudah ada: angka di sini ditarik
 * dari Jurnal Umum (journal_entries/journal_entry_lines, migrasi 0051)
 * yang sudah diposting otomatis dari invoice Lunas & Realisasi Event
 * (migrasi 0052) -- BUKAN dihitung ulang langsung dari tabel booking/
 * proyek/invoice seperti halaman Keuangan. Begitu ada transaksi baru yang
 * lewat Faktur/Realisasi Event, laporan ini otomatis ikut ter-update
 * tanpa perlu logika agregasi terpisah.
 *
 * Rentang tanggal lewat query string (?start=&end=) supaya bisa dibagikan
 * sebagai link & tidak perlu client component -- form di bawah kirim GET
 * ke rute yang sama, ditangani penuh oleh Server Component ini.
 */
export default async function LabaRugiPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile || (profile.division !== "all" && profile.division !== "finance")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const today = todayISO();
  const defaultStart = `${today.slice(0, 7)}-01`;
  const startDate = params.start || defaultStart;
  const endDate = params.end || today;

  const report = await getIncomeStatement(startDate, endDate);
  const isProfit = report.labaBersih >= 0;

  return (
    <div className="p-4 md:p-8">
      <div className="animate-fade-up flex items-start gap-4">
        <div className="relative shrink-0">
          <span
            className="absolute -inset-1.5 animate-pulse rounded-2xl bg-gradient-to-br from-emerald-500 to-lime-500 opacity-30 blur-lg"
            aria-hidden
          />
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-lime-500 text-white shadow-sm">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-500 dark:text-emerald-400">
            Admin — Akuntansi
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Laba-Rugi</h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Pendapatan dikurangi beban, ditarik langsung dari Jurnal Umum -- konsolidasi seluruh perusahaan dan
            rincian per divisi.
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
          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Tampilkan
        </button>
      </form>

      {report.entryCount === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Belum ada jurnal pada rentang tanggal ini -- coba perlebar rentang tanggal di atas.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Total Pendapatan
              </p>
              <p className="mt-1.5 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatRupiah(report.totalPendapatan)}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Total Beban
              </p>
              <p className="mt-1.5 text-xl font-bold text-rose-600 dark:text-rose-400">
                {formatRupiah(report.totalBeban)}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Laba Bersih
              </p>
              <p
                className={`mt-1.5 text-xl font-bold ${isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
              >
                {formatRupiah(report.labaBersih)}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Pendapatan</h2>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {report.pendapatan.length === 0 ? (
                    <tr>
                      <td className="py-2 text-zinc-400">Tidak ada pendapatan tercatat.</td>
                    </tr>
                  ) : (
                    report.pendapatan.map((line) => (
                      <tr key={line.accountCode} className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="py-2 text-zinc-600 dark:text-zinc-300">{line.accountName}</td>
                        <td className="py-2 text-right font-medium text-zinc-900 dark:text-white">
                          {formatRupiah(line.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Beban</h2>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {report.beban.length === 0 ? (
                    <tr>
                      <td className="py-2 text-zinc-400">Tidak ada beban tercatat.</td>
                    </tr>
                  ) : (
                    report.beban.map((line) => (
                      <tr key={line.accountCode} className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="py-2 text-zinc-600 dark:text-zinc-300">{line.accountName}</td>
                        <td className="py-2 text-right font-medium text-zinc-900 dark:text-white">
                          {formatRupiah(line.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Per Divisi</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    <th className="pb-2 font-medium">Divisi</th>
                    <th className="pb-2 text-right font-medium">Pendapatan</th>
                    <th className="pb-2 text-right font-medium">Beban</th>
                    <th className="pb-2 text-right font-medium">Laba Bersih</th>
                  </tr>
                </thead>
                <tbody>
                  {report.perDivisi.map((row) => (
                    <tr key={row.divisionKey} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="py-2 text-zinc-600 dark:text-zinc-300">{row.divisionLabel}</td>
                      <td className="py-2 text-right text-zinc-900 dark:text-white">
                        {formatRupiah(row.totalPendapatan)}
                      </td>
                      <td className="py-2 text-right text-zinc-900 dark:text-white">{formatRupiah(row.totalBeban)}</td>
                      <td
                        className={`py-2 text-right font-semibold ${row.labaBersih >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                      >
                        {formatRupiah(row.labaBersih)}
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
