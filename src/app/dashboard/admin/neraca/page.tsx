import { redirect } from "next/navigation";
import { Scale } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getBalanceSheet } from "@/lib/accounting/data";
import { formatRupiah, todayISO } from "@/lib/shared/utils";

/**
 * Neraca (Tahap D modul "Akuntansi") -- HANYA akses penuh. Beda dari
 * Laba-Rugi (Tahap C) yang berbasis rentang tanggal, Neraca adalah potret
 * PER TANGGAL yang mengakumulasi seluruh jurnal sejak awal -- lihat
 * komentar panjang di `getBalanceSheet` (src/lib/accounting/data.ts)
 * soal kenapa "Laba Berjalan (Belum Ditutup)" dihitung sebagai bagian
 * Modal supaya Aset = Kewajiban + Modal selalu balance.
 */
export default async function NeracaPage({
  searchParams,
}: {
  searchParams: Promise<{ tanggal?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile || profile.division !== "all") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const asOfDate = params.tanggal || todayISO();
  const sheet = await getBalanceSheet(asOfDate);

  return (
    <div className="p-4 md:p-8">
      <div className="animate-fade-up flex items-start gap-4">
        <div className="relative shrink-0">
          <span
            className="absolute -inset-1.5 animate-pulse rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 opacity-30 blur-lg"
            aria-hidden
          />
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-sm">
            <Scale className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-500 dark:text-indigo-400">
            Admin — Akuntansi
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Neraca</h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Posisi Aset, Kewajiban, dan Modal per tanggal tertentu, ditarik dari akumulasi seluruh Jurnal Umum
            sejak awal.
          </p>
        </div>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <label htmlFor="tanggal" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Per tanggal
          </label>
          <input
            id="tanggal"
            name="tanggal"
            type="date"
            defaultValue={asOfDate}
            className="mt-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Tampilkan
        </button>
      </form>

      {sheet.entryCount === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Belum ada jurnal sampai tanggal ini -- coba pilih tanggal yang lebih baru.
        </p>
      ) : (
        <>
          {!sheet.isBalanced && (
            <p className="mt-6 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
              Neraca tidak balance (Aset {formatRupiah(sheet.totalAset)} vs Kewajiban+Modal{" "}
              {formatRupiah(sheet.totalKewajiban + sheet.totalModal)}) -- ini seharusnya tidak pernah terjadi,
              tolong laporkan sebagai bug.
            </p>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Aset</h2>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {sheet.aset.length === 0 ? (
                    <tr>
                      <td className="py-2 text-zinc-400">Belum ada aset tercatat.</td>
                    </tr>
                  ) : (
                    sheet.aset.map((line) => (
                      <tr key={line.accountCode} className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="py-2 pr-2 text-zinc-600 dark:text-zinc-300">{line.accountName}</td>
                        <td className="py-2 text-right font-medium text-zinc-900 dark:text-white">
                          {formatRupiah(line.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-zinc-300 dark:border-zinc-700">
                    <td className="py-2 font-bold text-zinc-900 dark:text-white">Total Aset</td>
                    <td className="py-2 text-right font-bold text-zinc-900 dark:text-white">
                      {formatRupiah(sheet.totalAset)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Kewajiban</h2>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {sheet.kewajiban.length === 0 ? (
                    <tr>
                      <td className="py-2 text-zinc-400">Belum ada kewajiban tercatat.</td>
                    </tr>
                  ) : (
                    sheet.kewajiban.map((line) => (
                      <tr key={line.accountCode} className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="py-2 pr-2 text-zinc-600 dark:text-zinc-300">{line.accountName}</td>
                        <td className="py-2 text-right font-medium text-zinc-900 dark:text-white">
                          {formatRupiah(line.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-zinc-300 dark:border-zinc-700">
                    <td className="py-2 font-bold text-zinc-900 dark:text-white">Total Kewajiban</td>
                    <td className="py-2 text-right font-bold text-zinc-900 dark:text-white">
                      {formatRupiah(sheet.totalKewajiban)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Modal</h2>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {sheet.modal.length === 0 ? (
                    <tr>
                      <td className="py-2 text-zinc-400">Belum ada modal tercatat.</td>
                    </tr>
                  ) : (
                    sheet.modal.map((line) => (
                      <tr key={line.accountCode} className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="py-2 pr-2 text-zinc-600 dark:text-zinc-300">{line.accountName}</td>
                        <td className="py-2 text-right font-medium text-zinc-900 dark:text-white">
                          {formatRupiah(line.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                  <tr className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="py-2 pr-2 text-zinc-600 dark:text-zinc-300">
                      Laba Berjalan (Belum Ditutup)
                      <span className="block text-xs text-zinc-400">Pendapatan dikurangi Beban sejak awal</span>
                    </td>
                    <td className="py-2 text-right font-medium text-zinc-900 dark:text-white">
                      {formatRupiah(sheet.labaBerjalanBelumDitutup)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-zinc-300 dark:border-zinc-700">
                    <td className="py-2 font-bold text-zinc-900 dark:text-white">Total Modal</td>
                    <td className="py-2 text-right font-bold text-zinc-900 dark:text-white">
                      {formatRupiah(sheet.totalModal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
