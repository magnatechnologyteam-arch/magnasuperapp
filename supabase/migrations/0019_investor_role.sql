-- Peran baru "investor" — permintaan Owner (rancangan di papan tulis):
-- investor BUKAN akses penuh ('all') seperti Owner/Finance/Admin, melainkan
-- READ ONLY di semua divisi + kotak masuk khusus untuk menyetujui/menolak
-- "Pengajuan Modal" (permintaan dana sebelum sebuah event Magnativ digarap).
--
-- Alur sesuai rancangan:
--   1. OWNER (akun akses penuh 'all') mengajukan modal untuk sebuah event —
--      nama event, lokasi, tanggal (biasanya belum pasti/dadakan), perkiraan
--      Billing (A1) & Modal (A2).
--   2. INVESTOR dapat notifikasi, lihat semua pengajuan (read only lintas
--      divisi), lalu Approve/Reject dengan catatan.
--   3. Kalau disetujui, staf operasional (Magnarent/Magnative/Production)
--      dapat notifikasi biasa (pengumuman) supaya bersiap — TIDAK ikut
--      memutuskan apa pun.

-- 1) Perluas nilai division yang valid.
alter table public.profiles drop constraint if exists profiles_division_check;
alter table public.profiles
  add constraint profiles_division_check
  check (division in ('magnarent', 'magnative', 'production', 'all', 'investor'));

-- 2) Helper JWT-based (pola sama seperti current_user_division() di 0004) —
-- tidak query tabel apa pun jadi aman dipakai di banyak policy tanpa risiko
-- "infinite recursion".
create or replace function public.current_user_is_investor()
returns boolean
language sql
stable
as $$
  select public.current_user_division() = 'investor';
$$;

-- 3) Tabel "Pengajuan Modal". HANYA akses penuh yang boleh membuat/mengubah/
-- menghapus (dibuat Owner) — investor tidak menulis baris ini langsung,
-- keputusannya lewat fungsi `decide_capital_request` di bawah supaya status
-- "Menunggu -> Disetujui/Ditolak" tidak bisa diubah dua kali/balik lagi.
create table if not exists public.capital_requests (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  location text not null default '',
  -- Nullable dengan sengaja: catatan Owner "biasanya event dadakan jadi
  -- tanggal tidak pasti" — pengajuan tetap bisa dibuat tanpa tanggal pasti.
  event_date date,
  billing_estimate integer not null default 0 check (billing_estimate >= 0), -- "A1" di rancangan
  modal_estimate integer not null default 0 check (modal_estimate >= 0), -- "A2" di rancangan
  status text not null default 'Menunggu' check (status in ('Menunggu', 'Disetujui', 'Ditolak')),
  investor_note text,
  submitted_by uuid references auth.users (id) on delete set null,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.capital_requests;
create trigger set_updated_at before update on public.capital_requests
  for each row execute function public.set_updated_at();

alter table public.capital_requests enable row level security;

drop policy if exists "capital_requests_manage_full_access" on public.capital_requests;
create policy "capital_requests_manage_full_access"
  on public.capital_requests for all
  to authenticated
  using (public.current_user_division() = 'all')
  with check (public.current_user_division() = 'all');

drop policy if exists "capital_requests_select_investor" on public.capital_requests;
create policy "capital_requests_select_investor"
  on public.capital_requests for select
  to authenticated
  using (public.current_user_is_investor());

-- 4) Keputusan investor lewat SECURITY DEFINER: mengunci baris (mencegah dua
-- klik "Approve"/"Reject" beruntun jadi dobel), memastikan pemanggilnya
-- betul investor, dan menolak kalau pengajuan sudah pernah diputuskan.
create or replace function public.decide_capital_request(
  request_id uuid,
  new_status text,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req record;
begin
  if not public.current_user_is_investor() then
    raise exception 'Hanya akun investor yang bisa memutuskan pengajuan modal.';
  end if;
  if new_status not in ('Disetujui', 'Ditolak') then
    raise exception 'Status keputusan tidak valid.';
  end if;

  select * into req from public.capital_requests where id = request_id for update;

  if req is null then
    raise exception 'Pengajuan modal tidak ditemukan.';
  end if;
  if req.status <> 'Menunggu' then
    raise exception 'Pengajuan ini sudah diputuskan sebelumnya (%).', req.status;
  end if;

  update public.capital_requests
    set status = new_status, investor_note = note, decided_by = auth.uid(), decided_at = now()
    where id = request_id;
end;
$$;

grant execute on function public.decide_capital_request(uuid, text, text) to authenticated;

-- 5) "Read only lintas divisi" — TAMBAHAN policy SELECT khusus investor di
-- setiap tabel data operasional, TANPA menyentuh policy tulis yang sudah ada
-- sama sekali (aman dari regresi: policy Postgres bersifat permissive/OR,
-- jadi menambah policy select baru tidak pernah mengurangi akses yang sudah
-- ada). `can_access_division()`/`current_user_division() = 'all'` yang
-- dipakai policy tulis di semua tabel ini SENGAJA tidak diubah — investor
-- tidak akan pernah lolos cek itu karena division-nya bukan 'all' dan bukan
-- nama divisi manapun, jadi insert/update/delete tetap tertutup buat investor.
-- Dibungkus per-tabel dengan cek `to_regclass(...) is not null` — beberapa
-- tabel modul (mis. magnative_portfolio) ternyata migrasinya belum pernah
-- dijalankan di database ini, jadi tabelnya belum ada. Tanpa pengaman ini,
-- SQL akan gagal total di tabel yang belum ada dan tabel-tabel SESUDAHNYA
-- (di bawahnya) tidak sempat kebagian policy investor sama sekali. Aman
-- dijalankan ulang berkali-kali (idempotent), dan begitu suatu tabel
-- akhirnya dibuat lewat migrasinya sendiri, tinggal jalankan ulang skrip
-- ini supaya kebagian policy investor juga.
do $$
begin
  if to_regclass('public.profiles') is not null then
    drop policy if exists "profiles_select_investor" on public.profiles;
    create policy "profiles_select_investor"
      on public.profiles for select to authenticated using (public.current_user_is_investor());
  end if;

  if to_regclass('public.magnarent_inventory') is not null then
    drop policy if exists "magnarent_inventory_select_investor" on public.magnarent_inventory;
    create policy "magnarent_inventory_select_investor"
      on public.magnarent_inventory for select to authenticated using (public.current_user_is_investor());
  end if;

  if to_regclass('public.magnarent_bookings') is not null then
    drop policy if exists "magnarent_bookings_select_investor" on public.magnarent_bookings;
    create policy "magnarent_bookings_select_investor"
      on public.magnarent_bookings for select to authenticated using (public.current_user_is_investor());
  end if;

  if to_regclass('public.magnative_clients') is not null then
    drop policy if exists "magnative_clients_select_investor" on public.magnative_clients;
    create policy "magnative_clients_select_investor"
      on public.magnative_clients for select to authenticated using (public.current_user_is_investor());
  end if;

  if to_regclass('public.magnative_projects') is not null then
    drop policy if exists "magnative_projects_select_investor" on public.magnative_projects;
    create policy "magnative_projects_select_investor"
      on public.magnative_projects for select to authenticated using (public.current_user_is_investor());
  end if;

  if to_regclass('public.magnative_content_posts') is not null then
    drop policy if exists "magnative_content_posts_select_investor" on public.magnative_content_posts;
    create policy "magnative_content_posts_select_investor"
      on public.magnative_content_posts for select to authenticated using (public.current_user_is_investor());
  end if;

  if to_regclass('public.magnative_project_costs') is not null then
    drop policy if exists "magnative_project_costs_select_investor" on public.magnative_project_costs;
    create policy "magnative_project_costs_select_investor"
      on public.magnative_project_costs for select to authenticated using (public.current_user_is_investor());
  end if;

  if to_regclass('public.magnative_portfolio') is not null then
    drop policy if exists "magnative_portfolio_select_investor" on public.magnative_portfolio;
    create policy "magnative_portfolio_select_investor"
      on public.magnative_portfolio for select to authenticated using (public.current_user_is_investor());
  end if;

  if to_regclass('public.production_materials') is not null then
    drop policy if exists "production_materials_select_investor" on public.production_materials;
    create policy "production_materials_select_investor"
      on public.production_materials for select to authenticated using (public.current_user_is_investor());
  end if;

  if to_regclass('public.production_booth_projects') is not null then
    drop policy if exists "production_booth_projects_select_investor" on public.production_booth_projects;
    create policy "production_booth_projects_select_investor"
      on public.production_booth_projects for select to authenticated using (public.current_user_is_investor());
  end if;

  if to_regclass('public.production_purchase_orders') is not null then
    drop policy if exists "production_purchase_orders_select_investor" on public.production_purchase_orders;
    create policy "production_purchase_orders_select_investor"
      on public.production_purchase_orders for select to authenticated using (public.current_user_is_investor());
  end if;

  if to_regclass('public.products') is not null then
    drop policy if exists "products_select_investor" on public.products;
    create policy "products_select_investor"
      on public.products for select to authenticated using (public.current_user_is_investor());
  end if;

  if to_regclass('public.invoices') is not null then
    drop policy if exists "invoices_select_investor" on public.invoices;
    create policy "invoices_select_investor"
      on public.invoices for select to authenticated using (public.current_user_is_investor());
  end if;

  if to_regclass('public.activity_log') is not null then
    drop policy if exists "activity_log_select_investor" on public.activity_log;
    create policy "activity_log_select_investor"
      on public.activity_log for select to authenticated using (public.current_user_is_investor());
  end if;
end $$;
