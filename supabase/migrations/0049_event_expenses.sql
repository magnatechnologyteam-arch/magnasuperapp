-- Tahap A dari modul baru "Realisasi Event" (permintaan Owner, didiskusikan
-- dulu dengan detail sebelum dikerjakan): pencatatan pengeluaran lintas 3
-- divisi (Magnarent/Magnative/Production) + Finance/Umum (pengeluaran
-- operasional kantor yang tidak terikat event/proyek tertentu).
--
-- Ini PERLUASAN dari fitur "Biaya Proyek" yang sudah ada (migrasi 0017,
-- tabel `magnative_project_costs`) — bukan sistem pencatatan biaya kedua
-- yang terpisah. Tahap C nanti akan memindahkan data lama ke sini dan
-- menyesuaikan halaman Arus Kas Proyek supaya baca dari tabel ini.
--
-- Keputusan akses (hasil diskusi): modul ini dipakai SEMUA staf di 4
-- kategori (Magnarent/Magnative/Production/Finance), TERMASUK mencatat
-- pengeluaran "Finance/Umum" dari divisi manapun — bukan cuma staf Finance/
-- Admin. Yang TIDAK boleh akses sama sekali cuma Investor (beda dari
-- kebanyakan tabel operasional lain yang investor dapat SELECT read-only
-- lintas divisi lewat migrasi 0019 — di modul ini investor sengaja
-- dikecualikan total).
create table if not exists public.event_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  -- Divisi yang "punya" pengeluaran ini (buat rekap/filter) — 'finance'
  -- dipakai untuk pengeluaran operasional kantor yang tidak terikat event
  -- manapun. Nilai ini beda konsep dari `profiles.division` (yang menentukan
  -- hak akses login) — di sini murni label kategori pengeluaran, karena
  -- modul ini sengaja terbuka untuk semua staf non-investor apa pun
  -- divisinya (lihat komentar RLS di bawah).
  division text not null check (division in ('magnarent', 'magnative', 'production', 'finance')),
  -- Rujukan opsional ke booking/proyek sumber. TIDAK pakai foreign key
  -- (sumbernya bisa dari salah satu dari 3 tabel berbeda tergantung
  -- `source_type`, dan Postgres tidak punya FK polimorfik) — pola sama
  -- persis dengan `invoices.source_type`/`source_id` (migrasi 0014).
  -- 'umum' dipakai untuk pengeluaran Finance/operasional yang tidak
  -- terikat ke event/proyek tertentu, jadi `source_id`-nya wajib kosong.
  source_type text not null check (source_type in ('magnarent_booking', 'magnative_project', 'production_booth', 'umum')),
  source_id uuid,
  constraint event_expenses_source_id_matches_type check (
    (source_type = 'umum' and source_id is null) or
    (source_type <> 'umum' and source_id is not null)
  ),
  category text not null check (category in (
    'Sewa Venue', 'Dekorasi & Material', 'Transportasi', 'Konsumsi',
    'Talent / Vendor', 'Percetakan', 'Operasional Kantor', 'Lain-lain'
  )),
  amount integer not null check (amount >= 0),
  -- PIC yang benar-benar mengeluarkan/memegang dana di lapangan — teks
  -- bebas, SENGAJA terpisah dari `created_by` (siapa yang input datanya ke
  -- sistem) karena bisa jadi dua orang berbeda.
  pic_name text not null,
  -- Teks bebas dengan saran umum di UI (Qris/Transfer BCA/Kantong Jago/
  -- Cash/dll) — bukan enum tertutup, supaya bisa nambah metode/rekening
  -- baru kapan saja tanpa migrasi.
  payment_method text not null,
  reimbursement_status text not null default 'Tidak Perlu'
    check (reimbursement_status in ('Tidak Perlu', 'Belum Diganti', 'Sudah Diganti')),
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_expenses_source_idx
  on public.event_expenses (source_type, source_id);
create index if not exists event_expenses_expense_date_idx
  on public.event_expenses (expense_date desc);
create index if not exists event_expenses_created_by_idx
  on public.event_expenses (created_by);

drop trigger if exists set_updated_at on public.event_expenses;
create trigger set_updated_at before update on public.event_expenses
  for each row execute function public.set_updated_at();

alter table public.event_expenses enable row level security;
drop policy if exists "event_expenses_access" on public.event_expenses;
create policy "event_expenses_access"
  on public.event_expenses for all
  to authenticated
  using (not public.current_user_is_investor())
  with check (not public.current_user_is_investor());

-- Bukti transaksi — SATU pengeluaran bisa punya LEBIH dari satu file bukti
-- (nota + bukti transfer terpisah, dll), jadi dipisah ke tabel sendiri
-- (bukan kolom array/jsonb di event_expenses) supaya gampang ditambah/
-- dihapus satu-satu dari UI, pola sama seperti chat_attachments (0039).
create table if not exists public.event_expense_proofs (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.event_expenses (id) on delete cascade,
  file_url text not null,
  storage_path text not null,
  -- Nama tampilan yang dilihat/diunduh user, mengikuti template yang sudah
  -- disepakati: Nama_TanggalBulan_Nominal_KeteranganPengeluaran. Nama file
  -- SEBENARNYA di Storage (storage_path) tetap pakai path acak (lihat
  -- komentar bucket di bawah) — kolom ini cuma untuk ditampilkan.
  file_name text not null,
  uploaded_at timestamptz not null default now()
);

create index if not exists event_expense_proofs_expense_id_idx
  on public.event_expense_proofs (expense_id);
alter table public.event_expense_proofs enable row level security;

drop policy if exists "event_expense_proofs_access" on public.event_expense_proofs;
create policy "event_expense_proofs_access"
  on public.event_expense_proofs for all
  to authenticated
  using (not public.current_user_is_investor())
  with check (not public.current_user_is_investor());

-- Bucket Storage untuk file bukti — pola sama persis dengan
-- `capital-request-proofs` (migrasi 0028): public bucket (path-nya berisi
-- UUID acak, tidak gampang ditebak) supaya URL publiknya bisa langsung
-- dipakai di <img>/link tanpa signed URL, tapi insert/update/delete
-- dibatasi cuma staf non-investor.
insert into storage.buckets (id, name, public)
values ('event-expense-proofs', 'event-expense-proofs', true)
on conflict (id) do nothing;

drop policy if exists "event_expense_proofs_storage_read" on storage.objects;
create policy "event_expense_proofs_storage_read"
  on storage.objects for select
  to public
  using (bucket_id = 'event-expense-proofs');

drop policy if exists "event_expense_proofs_storage_insert" on storage.objects;
create policy "event_expense_proofs_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'event-expense-proofs' and not public.current_user_is_investor());

drop policy if exists "event_expense_proofs_storage_update" on storage.objects;
create policy "event_expense_proofs_storage_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'event-expense-proofs' and not public.current_user_is_investor())
  with check (bucket_id = 'event-expense-proofs' and not public.current_user_is_investor());

drop policy if exists "event_expense_proofs_storage_delete" on storage.objects;
create policy "event_expense_proofs_storage_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'event-expense-proofs' and not public.current_user_is_investor());
