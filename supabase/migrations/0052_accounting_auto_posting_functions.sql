-- Tahap B modul "Akuntansi": auto-posting jurnal dari Realisasi Event
-- (event_expenses). Beda dari posting invoice (yang cukup lewat TypeScript
-- biasa karena halaman Faktur sudah dibatasi division "all"), modul
-- Realisasi Event SENGAJA dipakai SEMUA staf non-investor apa pun
-- divisinya (migrasi 0049) -- kalau posting jurnalnya lewat client
-- Supabase biasa, staf Magnarent/Magnative/Production akan kena tolak RLS
-- chart_of_accounts/journal_entries (yang cuma division "all"). Makanya
-- dibungkus SECURITY DEFINER, pola sama persis dengan
-- `decide_capital_request` (migrasi 0019) -- fungsi ini re-derive semua
-- nilai dari baris event_expenses ASLI (bukan percaya parameter bebas dari
-- caller), jadi walau dipanggil manual lewat RPC, hasilnya tetap jurnal
-- yang benar untuk expense itu, bukan bisa dipakai memalsukan angka.
--
-- Posting invoice (postInvoiceLunasJournal) ada di
-- src/lib/accounting/actions.ts, TIDAK di sini -- lihat komentar di sana.
create or replace function public.post_event_expense_journal(p_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense record;
  v_debit_code text;
  v_credit_code text;
  v_debit_account uuid;
  v_credit_account uuid;
  v_entry_id uuid;
begin
  -- Batas akses sama persis dengan RLS event_expenses_access (migrasi
  -- 0049): investor tidak boleh sentuh modul ini sama sekali.
  if public.current_user_is_investor() then
    raise exception 'Investor tidak memiliki akses ke jurnal akuntansi.';
  end if;

  select * into v_expense from public.event_expenses where id = p_expense_id;
  if not found then
    return; -- expense sudah terhapus duluan sebelum sempat diposting
  end if;

  -- Re-posting (dipanggil ulang saat expense diedit) -- hapus jurnal lama
  -- dulu supaya tidak dobel, baru buat yang baru dari data terkini.
  delete from public.journal_entries
    where source_type = 'event_expense' and source_id = p_expense_id;

  v_debit_code := case v_expense.category
    when 'Sewa Venue' then '5-1001'
    when 'Dekorasi & Material' then '5-1002'
    when 'Transportasi' then '5-1003'
    when 'Konsumsi' then '5-1004'
    when 'Talent / Vendor' then '5-1005'
    when 'Percetakan' then '5-1006'
    when 'Operasional Kantor' then '5-1007'
    else '5-1008'
  end;

  -- Kalau statusnya "Belum Diganti" (PIC talangi pakai uang pribadi,
  -- perusahaan belum ganti), kreditnya ke Hutang Reimbursement Karyawan --
  -- BUKAN dari Kas/Bank, karena uang perusahaan belum benar-benar keluar.
  -- Selain itu, tebak Kas Kecil vs Bank dari teks metode pembayaran (belum
  -- ada kolom akun kas eksplisit) -- "cash" ke Kas Kecil, selain itu
  -- (Transfer/Qris/dompet digital) ke Bank Operasional.
  v_credit_code := case
    when v_expense.reimbursement_status = 'Belum Diganti' then '2-1100'
    when v_expense.payment_method ilike '%cash%' then '1-1001'
    else '1-1002'
  end;

  select id into v_debit_account from public.chart_of_accounts where account_code = v_debit_code;
  select id into v_credit_account from public.chart_of_accounts where account_code = v_credit_code;

  if v_debit_account is null or v_credit_account is null then
    raise warning 'post_event_expense_journal: akun % atau % tidak ditemukan untuk expense %',
      v_debit_code, v_credit_code, p_expense_id;
    return;
  end if;

  insert into public.journal_entries (entry_date, description, source_type, source_id, division, created_by)
  values (
    v_expense.expense_date,
    'Realisasi Event — ' || v_expense.category || ' (' || v_expense.pic_name || ')',
    'event_expense',
    p_expense_id,
    v_expense.division,
    v_expense.created_by
  )
  returning id into v_entry_id;

  insert into public.journal_entry_lines (journal_entry_id, account_id, debit, credit, notes) values
    (v_entry_id, v_debit_account, v_expense.amount, 0, v_expense.notes),
    (v_entry_id, v_credit_account, 0, v_expense.amount, null);
end;
$$;

revoke execute on function public.post_event_expense_journal(uuid) from public;
grant execute on function public.post_event_expense_journal(uuid) to authenticated;

-- Hapus jurnal terhubung saat event_expense-nya dihapus.
create or replace function public.delete_event_expense_journal(p_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_is_investor() then
    raise exception 'Investor tidak memiliki akses ke jurnal akuntansi.';
  end if;

  delete from public.journal_entries
    where source_type = 'event_expense' and source_id = p_expense_id;
end;
$$;

revoke execute on function public.delete_event_expense_journal(uuid) from public;
grant execute on function public.delete_event_expense_journal(uuid) to authenticated;
