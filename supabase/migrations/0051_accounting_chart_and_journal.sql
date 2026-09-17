-- Tahap A dari modul baru "Akuntansi" (sistem pembukuan berbasis jurnal
-- umum/double-entry) -- hasil diskusi finance: MagnaSuperApp perlu Laba-
-- Rugi, Neraca, dan Arus Kas yang benar-benar saling nyambung dari satu
-- sumber, bukan dihitung terpisah-pisah per halaman seperti Keuangan/Arus
-- Kas Proyek/Laporan yang sudah ada sekarang. Fondasinya: Daftar Akun
-- (Chart of Accounts) + Jurnal Umum (setiap transaksi = minimal 2 baris
-- debit/kredit yang harus balance).
--
-- SENGAJA di tahap ini TIDAK ada auto-posting dari modul lain (invoice,
-- event_expenses, capital_requests) -- itu Tahap B. Perlakuan dana
-- investor (Utang vs Modal/Ekuitas) juga masih menunggu keputusan Owner/
-- manager, jadi akun terkait investor SENGAJA belum dibuat di seed Daftar
-- Akun di bawah -- begitu ada kepastian, tinggal ditambah akunnya tanpa
-- mengubah struktur ini.
--
-- Akses: HANYA division 'all' (Owner/Finance) -- beda dari kebanyakan
-- modul lain, Investor SENGAJA TIDAK diberi akses SELECT sama sekali ke
-- jurnal mentah (beda dari capital_requests/invoices yang investor bisa
-- lihat read-only) karena buku besar berisi rincian keuangan penuh
-- perusahaan, bukan cuma satu proyek. Kalau nanti investor perlu lihat
-- ringkasan (Laba-Rugi/Neraca), itu bisa lewat laporan terpisah yang query
-- dari sini tanpa membuka akses ke tabel jurnal itu sendiri.

create table if not exists public.chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  account_code text not null unique,
  account_name text not null,
  account_type text not null check (account_type in ('Aset', 'Kewajiban', 'Modal', 'Pendapatan', 'Beban')),
  -- Sub-kategori buat pengelompokan di Neraca (mis. Aset Lancar vs Aset
  -- Tetap) -- teks bebas, bukan enum tertutup, supaya gampang nambah
  -- kategori baru tanpa migrasi.
  account_subtype text not null default '',
  -- Saldo normal akun ini bertambah lewat sisi mana -- Aset/Beban
  -- normalnya Debit, Kewajiban/Modal/Pendapatan normalnya Kredit. Dipakai
  -- laporan buat tahu arah tampilan saldo (bukan buat validasi jurnal,
  -- jurnal boleh posting ke sisi manapun sesuai transaksinya).
  normal_balance text not null check (normal_balance in ('Debit', 'Kredit')),
  is_active boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.chart_of_accounts;
create trigger set_updated_at before update on public.chart_of_accounts
  for each row execute function public.set_updated_at();

alter table public.chart_of_accounts enable row level security;
drop policy if exists "chart_of_accounts_access" on public.chart_of_accounts;
create policy "chart_of_accounts_access"
  on public.chart_of_accounts for all
  to authenticated
  using (public.current_user_division() = 'all')
  with check (public.current_user_division() = 'all');

-- Jurnal Umum -- header transaksi. Satu entri = satu transaksi (mis.
-- "Terima pelunasan invoice INV-0001"), garis debit/kredit-nya ada di
-- journal_entry_lines.
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  reference_number text,
  description text not null,
  -- Rujukan opsional ke transaksi sumber (invoice/event_expense/manual,
  -- dst) -- pola polimorfik sama seperti event_expenses.source_type/
  -- source_id (migrasi 0049), dipakai Tahap B buat auto-posting supaya
  -- tiap jurnal bisa dilacak balik ke transaksi aslinya.
  source_type text not null default 'manual'
    check (source_type in ('manual', 'invoice', 'event_expense', 'capital_request')),
  source_id uuid,
  -- Label proyek/event opsional (dari event_expenses.division atau source
  -- proyek terkait) buat nanti bisa hitung Laba-Rugi PER DIVISI/PROYEK,
  -- bukan cuma konsolidasi perusahaan -- lihat rencana Tahap D.
  division text check (division in ('magnarent', 'magnative', 'production', 'finance')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journal_entries_entry_date_idx on public.journal_entries (entry_date desc);
create index if not exists journal_entries_source_idx on public.journal_entries (source_type, source_id);

drop trigger if exists set_updated_at on public.journal_entries;
create trigger set_updated_at before update on public.journal_entries
  for each row execute function public.set_updated_at();

alter table public.journal_entries enable row level security;
drop policy if exists "journal_entries_access" on public.journal_entries;
create policy "journal_entries_access"
  on public.journal_entries for all
  to authenticated
  using (public.current_user_division() = 'all')
  with check (public.current_user_division() = 'all');

-- Baris debit/kredit tiap entri jurnal.
create table if not exists public.journal_entry_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries (id) on delete cascade,
  account_id uuid not null references public.chart_of_accounts (id),
  debit integer not null default 0 check (debit >= 0),
  credit integer not null default 0 check (credit >= 0),
  -- Satu baris cuma boleh isi salah satu sisi, tidak keduanya sekaligus
  -- (dan tidak boleh dua-duanya nol -- baris kosong tidak ada gunanya).
  constraint journal_entry_lines_one_side check (
    (debit > 0 and credit = 0) or (credit > 0 and debit = 0)
  ),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists journal_entry_lines_entry_idx on public.journal_entry_lines (journal_entry_id);
create index if not exists journal_entry_lines_account_idx on public.journal_entry_lines (account_id);

alter table public.journal_entry_lines enable row level security;
drop policy if exists "journal_entry_lines_access" on public.journal_entry_lines;
create policy "journal_entry_lines_access"
  on public.journal_entry_lines for all
  to authenticated
  using (public.current_user_division() = 'all')
  with check (public.current_user_division() = 'all');

-- Jantung integritas double-entry: total debit HARUS SAMA DENGAN total
-- kredit di satu entri jurnal. Dicek lewat constraint trigger yang
-- DEFERRABLE INITIALLY DEFERRED supaya baris-baris satu entri (yang pasti
-- di-insert satu-satu lewat beberapa statement dalam satu transaksi) boleh
-- "belum balance sementara" selama transaksinya belum commit -- baru
-- divalidasi pas commit / akhir transaksi.
create or replace function public.check_journal_entry_balanced()
returns trigger
language plpgsql
as $$
declare
  v_entry_id uuid;
  v_total_debit numeric;
  v_total_credit numeric;
begin
  v_entry_id := coalesce(new.journal_entry_id, old.journal_entry_id);

  select coalesce(sum(debit), 0), coalesce(sum(credit), 0)
    into v_total_debit, v_total_credit
    from public.journal_entry_lines
    where journal_entry_id = v_entry_id;

  if v_total_debit <> v_total_credit then
    raise exception 'Jurnal % tidak balance: total debit % tidak sama dengan total kredit %',
      v_entry_id, v_total_debit, v_total_credit;
  end if;

  return null;
end;
$$;

drop trigger if exists journal_entry_lines_balance_check on public.journal_entry_lines;
create constraint trigger journal_entry_lines_balance_check
  after insert or update or delete on public.journal_entry_lines
  deferrable initially deferred
  for each row execute function public.check_journal_entry_balanced();

-- Seed Daftar Akun default, disesuaikan dengan kategori yang SUDAH DIPAKAI
-- di modul lain (EXPENSE_CATEGORIES di event-expenses/types.ts, dan 3
-- divisi operasional) supaya Tahap B (auto-posting) tinggal mapping 1-ke-1
-- tanpa perlu akun tambahan.
insert into public.chart_of_accounts (account_code, account_name, account_type, account_subtype, normal_balance) values
  ('1-1001', 'Kas Kecil', 'Aset', 'Aset Lancar', 'Debit'),
  ('1-1002', 'Bank Operasional', 'Aset', 'Aset Lancar', 'Debit'),
  ('1-1100', 'Piutang Usaha', 'Aset', 'Aset Lancar', 'Debit'),
  ('1-2001', 'Peralatan Sewa (Magnarent)', 'Aset', 'Aset Tetap', 'Debit'),
  ('1-2002', 'Peralatan Produksi (Booth)', 'Aset', 'Aset Tetap', 'Debit'),
  ('1-2900', 'Akumulasi Penyusutan Peralatan', 'Aset', 'Aset Tetap', 'Kredit'),
  ('2-1000', 'Hutang Usaha (Vendor/Supplier)', 'Kewajiban', 'Kewajiban Jangka Pendek', 'Kredit'),
  ('2-1100', 'Hutang Reimbursement Karyawan', 'Kewajiban', 'Kewajiban Jangka Pendek', 'Kredit'),
  ('2-1200', 'Hutang Pajak (PPN/PPh)', 'Kewajiban', 'Kewajiban Jangka Pendek', 'Kredit'),
  ('3-1000', 'Modal Pemilik', 'Modal', 'Ekuitas', 'Kredit'),
  ('3-2000', 'Laba Ditahan', 'Modal', 'Ekuitas', 'Kredit'),
  ('4-1000', 'Pendapatan Magnarent (Sewa Alat)', 'Pendapatan', 'Pendapatan Operasional', 'Kredit'),
  ('4-2000', 'Pendapatan Magnativ (Jasa EO/Kreatif)', 'Pendapatan', 'Pendapatan Operasional', 'Kredit'),
  ('4-3000', 'Pendapatan Production (Jasa Booth)', 'Pendapatan', 'Pendapatan Operasional', 'Kredit'),
  ('4-9000', 'Pendapatan Lain-lain', 'Pendapatan', 'Pendapatan Non-Operasional', 'Kredit'),
  ('5-1001', 'Beban Sewa Venue', 'Beban', 'Beban Operasional Event', 'Debit'),
  ('5-1002', 'Beban Dekorasi & Material', 'Beban', 'Beban Operasional Event', 'Debit'),
  ('5-1003', 'Beban Transportasi', 'Beban', 'Beban Operasional Event', 'Debit'),
  ('5-1004', 'Beban Konsumsi', 'Beban', 'Beban Operasional Event', 'Debit'),
  ('5-1005', 'Beban Talent / Vendor', 'Beban', 'Beban Operasional Event', 'Debit'),
  ('5-1006', 'Beban Percetakan', 'Beban', 'Beban Operasional Event', 'Debit'),
  ('5-1007', 'Beban Operasional Kantor', 'Beban', 'Beban Operasional Kantor', 'Debit'),
  ('5-1008', 'Beban Lain-lain', 'Beban', 'Beban Operasional Event', 'Debit')
on conflict (account_code) do nothing;
