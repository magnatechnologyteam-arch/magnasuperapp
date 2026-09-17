import { createClient } from "@/lib/supabase/server";

/**
 * Sisi BACA modul "Akuntansi" (Tahap C) -- Laporan Laba-Rugi ditarik
 * langsung dari Jurnal Umum yang sudah diposting Tahap A/B, BUKAN dihitung
 * ulang dari invoices/event_expenses seperti halaman Keuangan/Arus Kas
 * Proyek lama -- ini justru poin utamanya: begitu jurnalnya benar, semua
 * laporan turunan (Laba-Rugi, Neraca nanti di Tahap D, Arus Kas di Tahap
 * E) otomatis konsisten satu sama lain karena sumbernya sama.
 *
 * Query-lalu-gabung di TypeScript (bukan SQL view/RPC agregat) -- pola
 * yang sama dipakai di seluruh modul lain (Keuangan, Laporan, Arus Kas
 * Proyek), supaya gampang dibaca/di-maintain tanpa perlu buka dua tempat
 * (kode + definisi view database) buat ngerti satu angka.
 */

export type IncomeStatementLine = {
  accountCode: string;
  accountName: string;
  amount: number;
};

export type DivisionBreakdown = {
  divisionKey: string;
  divisionLabel: string;
  totalPendapatan: number;
  totalBeban: number;
  labaBersih: number;
};

export type IncomeStatement = {
  startDate: string;
  endDate: string;
  pendapatan: IncomeStatementLine[];
  beban: IncomeStatementLine[];
  totalPendapatan: number;
  totalBeban: number;
  labaBersih: number;
  perDivisi: DivisionBreakdown[];
  /** Jumlah entri jurnal yang masuk hitungan -- ditampilkan di UI supaya
   * kelihatan kalau laporannya kosong karena memang belum ada transaksi
   * di rentang tanggal itu (bukan karena ada yang salah). */
  entryCount: number;
};

const DIVISION_LABELS: Record<string, string> = {
  magnarent: "Magnarent",
  magnative: "Magnativ",
  production: "Production",
  finance: "Finance/Umum",
  "": "Tanpa Divisi (Jurnal Manual)",
};

function emptyIncomeStatement(startDate: string, endDate: string): IncomeStatement {
  return {
    startDate,
    endDate,
    pendapatan: [],
    beban: [],
    totalPendapatan: 0,
    totalBeban: 0,
    labaBersih: 0,
    perDivisi: [],
    entryCount: 0,
  };
}

export async function getIncomeStatement(startDate: string, endDate: string): Promise<IncomeStatement> {
  const supabase = await createClient();

  const { data: entries, error: entriesError } = await supabase
    .from("journal_entries")
    .select("id, division")
    .gte("entry_date", startDate)
    .lte("entry_date", endDate)
    .returns<{ id: string; division: string | null }[]>();

  if (entriesError) {
    console.error("[accounting] getIncomeStatement: gagal ambil journal_entries:", entriesError.message);
    return emptyIncomeStatement(startDate, endDate);
  }
  if (!entries || entries.length === 0) {
    return emptyIncomeStatement(startDate, endDate);
  }

  const divisionByEntry = new Map(entries.map((e) => [e.id, e.division ?? ""]));
  const entryIds = entries.map((e) => e.id);

  const [{ data: lines, error: linesError }, { data: accounts, error: accountsError }] = await Promise.all([
    supabase
      .from("journal_entry_lines")
      .select("journal_entry_id, account_id, debit, credit")
      .in("journal_entry_id", entryIds)
      .returns<{ journal_entry_id: string; account_id: string; debit: number; credit: number }[]>(),
    supabase
      .from("chart_of_accounts")
      .select("id, account_code, account_name, account_type")
      .returns<{ id: string; account_code: string; account_name: string; account_type: string }[]>(),
  ]);

  if (linesError || accountsError) {
    console.error(
      "[accounting] getIncomeStatement: gagal ambil baris jurnal/daftar akun:",
      linesError?.message,
      accountsError?.message
    );
    return emptyIncomeStatement(startDate, endDate);
  }

  const accountById = new Map((accounts ?? []).map((a) => [a.id, a]));
  const pendapatanByAccount = new Map<string, number>();
  const bebanByAccount = new Map<string, number>();
  const perDivisiMap = new Map<string, { totalPendapatan: number; totalBeban: number }>();

  for (const line of lines ?? []) {
    const account = accountById.get(line.account_id);
    if (!account) continue;
    const divisionKey = divisionByEntry.get(line.journal_entry_id) ?? "";
    const bucket = perDivisiMap.get(divisionKey) ?? { totalPendapatan: 0, totalBeban: 0 };

    if (account.account_type === "Pendapatan") {
      // Saldo normal Pendapatan ada di sisi Kredit.
      const net = line.credit - line.debit;
      pendapatanByAccount.set(account.account_code, (pendapatanByAccount.get(account.account_code) ?? 0) + net);
      bucket.totalPendapatan += net;
      perDivisiMap.set(divisionKey, bucket);
    } else if (account.account_type === "Beban") {
      // Saldo normal Beban ada di sisi Debit.
      const net = line.debit - line.credit;
      bebanByAccount.set(account.account_code, (bebanByAccount.get(account.account_code) ?? 0) + net);
      bucket.totalBeban += net;
      perDivisiMap.set(divisionKey, bucket);
    }
  }

  const accountsByCode = new Map((accounts ?? []).map((a) => [a.account_code, a]));
  const toLines = (map: Map<string, number>): IncomeStatementLine[] =>
    Array.from(map.entries())
      .filter(([, amount]) => amount !== 0)
      .map(([code, amount]) => ({
        accountCode: code,
        accountName: accountsByCode.get(code)?.account_name ?? code,
        amount,
      }))
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const pendapatan = toLines(pendapatanByAccount);
  const beban = toLines(bebanByAccount);
  const totalPendapatan = pendapatan.reduce((sum, l) => sum + l.amount, 0);
  const totalBeban = beban.reduce((sum, l) => sum + l.amount, 0);

  const perDivisi: DivisionBreakdown[] = Array.from(perDivisiMap.entries())
    .map(([divisionKey, v]) => ({
      divisionKey,
      divisionLabel: DIVISION_LABELS[divisionKey] ?? divisionKey,
      totalPendapatan: v.totalPendapatan,
      totalBeban: v.totalBeban,
      labaBersih: v.totalPendapatan - v.totalBeban,
    }))
    .sort((a, b) => b.labaBersih - a.labaBersih);

  return {
    startDate,
    endDate,
    pendapatan,
    beban,
    totalPendapatan,
    totalBeban,
    labaBersih: totalPendapatan - totalBeban,
    perDivisi,
    entryCount: entries.length,
  };
}
