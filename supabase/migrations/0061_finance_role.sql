-- Peran baru "finance" — celah nyata yang ditemukan saat QA modul Akuntansi:
-- SEBELUM migrasi ini, satu-satunya cara memberi staf akses ke halaman
-- keuangan (Piutang & Pendapatan, Akuntansi, Laba-Rugi, Neraca, Arus Kas,
-- Faktur) adalah lewat division "all" ("Akses Penuh") — yang JUGA otomatis
-- memberi akses Kelola Pengguna (buat/hapus akun staf lain), Pengajuan
-- Modal (keputusan investor), dan Status Sistem. Beberapa komentar lama di
-- kode (mis. src/app/dashboard/admin/arus-kas/page.tsx, pengguna/page.tsx)
-- memang menyebut "'all' mencakup Owner/Finance/Investor sekaligus" sebagai
-- keputusan desain awal — tapi itu berarti staf Finance yang BUKAN
-- Owner/Admin terpaksa diberi akses Kelola Pengguna juga kalau mau bisa
-- pakai halaman Akuntansi, padahal mereka tidak seharusnya bisa mengelola
-- akun staf lain. Migrasi ini memisahkan "Finance" jadi division sendiri,
-- dengan akses PERSIS ke halaman-halaman keuangan itu saja — pola
-- non-regresif yang sama seperti migrasi 0019 (investor_role): policy
-- BACA/TULIS yang sudah ada TIDAK PERNAH disentuh/dikurangi, cuma ditambah
-- kondisi baru (policy Postgres bersifat permissive/OR, jadi menambah
-- kondisi tidak pernah mengurangi akses siapa pun yang sudah ada sekarang).
--
-- CATATAN: kolom journal_entries.division (migrasi 0051) KEBETULAN sudah
-- punya nilai 'finance' di check constraint-nya — itu LABEL PROYEK/PUSAT
-- BIAYA untuk satu entri jurnal (mis. beban kantor umum yang bukan milik
-- satu divisi operasional manapun), KONSEP BERBEDA TOTAL dari
-- profiles.division (peran/akses akun) yang diperluas di migrasi ini.
-- Kebetulan nama sama, tidak ada hubungan sama sekali.

-- 1) Perluas nilai division yang valid di profiles.
alter table public.profiles drop constraint if exists profiles_division_check;
alter table public.profiles
  add constraint profiles_division_check
  check (division in ('magnarent', 'magnative', 'production', 'all', 'investor', 'finance'));

-- 2) Helper JWT-based (pola sama seperti current_user_is_investor() di
-- 0019) — tidak query tabel apa pun jadi aman dipakai di banyak policy
-- tanpa risiko "infinite recursion", dan search_path dikunci dari awal
-- (pola pengerasan keamanan migrasi 0045).
create or replace function public.current_user_is_finance()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select public.current_user_division() = 'finance';
$$;

-- 3) Akses PENUH (setara division 'all') ke tiga tabel inti modul
-- Akuntansi — chart_of_accounts, journal_entries, journal_entry_lines
-- (migrasi 0051) SENGAJA belum pernah dipecah jadi policy per-aksi seperti
-- 0046-0048 (dibuat SESUDAH batch pemecahan itu), jadi cukup ALTER POLICY
-- "for all"-nya langsung menjadi union dua kondisi — Finance memang perlu
-- baca+tulis penuh di sini (input jurnal manual, kelola Daftar Akun),
-- bukan cuma baca seperti Investor.
alter policy "chart_of_accounts_access" on public.chart_of_accounts
  using (public.current_user_division() = 'all' or public.current_user_is_finance())
  with check (public.current_user_division() = 'all' or public.current_user_is_finance());

alter policy "journal_entries_access" on public.journal_entries
  using (public.current_user_division() = 'all' or public.current_user_is_finance())
  with check (public.current_user_division() = 'all' or public.current_user_is_finance());

alter policy "journal_entry_lines_access" on public.journal_entry_lines
  using (public.current_user_division() = 'all' or public.current_user_is_finance())
  with check (public.current_user_division() = 'all' or public.current_user_is_finance());

-- 4) invoices: Faktur adalah alat kerja Finance sehari-hari (buat/edit/
-- hapus invoice, tandai Lunas) — bukan cuma laporan yang dibaca, jadi
-- Finance perlu keempat aksi (select/insert/update/delete) yang sudah
-- dipisah sejak 0046, bukan cuma select seperti Investor.
alter policy invoices_select on public.invoices
  using ((current_user_division() = 'all'::text) or current_user_is_investor() or public.current_user_is_finance());
alter policy invoices_insert on public.invoices
  with check ((current_user_division() = 'all'::text) or public.current_user_is_finance());
alter policy invoices_update on public.invoices
  using ((current_user_division() = 'all'::text) or public.current_user_is_finance())
  with check ((current_user_division() = 'all'::text) or public.current_user_is_finance());
alter policy invoices_delete on public.invoices
  using ((current_user_division() = 'all'::text) or public.current_user_is_finance());

-- 5) Read-only lintas divisi di 4 tabel sumber yang dipakai halaman
-- "Piutang & Pendapatan" (agregasi) dan "Faktur" (daftar sumber invoice) —
-- POLA SAMA PERSIS seperti Investor di 0046/0048: cuma tambah kondisi
-- SELECT, insert/update/delete tetap TERTUTUP untuk Finance di tabel-tabel
-- operasional ini (Finance melihat/menagih, bukan mengubah data
-- booking/proyek divisi lain). magnative_clients & event_expenses SENGAJA
-- tidak disentuh -- keduanya sudah terbuka ke semua akun non-investor sejak
-- awal (lihat magnative_clients_select di 0047 & event_expenses_access di
-- 0049), jadi Finance otomatis kebagian begitu division "finance" valid.
--
-- PENTING: qual di bawah untuk magnarent_bookings/magnative_projects/
-- production_booth_projects DIVERIFIKASI LANGSUNG terhadap pg_policies
-- sebelum migrasi ini diterapkan ke database (bukan disalin dari asumsi
-- versi lama di 0046/0048) -- ternyata sudah bertambah kondisi
-- `current_user_can_view_linked_source(...)` dari migrasi lain yang belum
-- sempat disinkronkan ke file lokal repo ini. Ditulis verbatim + tambahan
-- "or current_user_is_finance()" supaya kondisi itu TIDAK ikut hilang.
alter policy magnarent_bookings_select on public.magnarent_bookings
  using (
    can_access_division('magnarent'::text)
    or current_user_is_investor()
    or current_user_can_view_linked_source('magnarent_booking'::text, id)
    or public.current_user_is_finance()
  );
alter policy magnarent_inventory_select on public.magnarent_inventory
  using (can_access_division('magnarent'::text) or current_user_is_investor() or public.current_user_is_finance());
alter policy magnative_projects_select on public.magnative_projects
  using (
    can_access_division('magnative'::text)
    or current_user_is_investor()
    or current_user_can_view_linked_source('magnative_project'::text, id)
    or public.current_user_is_finance()
  );
alter policy production_booth_projects_select on public.production_booth_projects
  using (
    can_access_division('production'::text)
    or current_user_is_investor()
    or current_user_can_view_linked_source('production_booth_project'::text, id)
    or public.current_user_is_finance()
  );
