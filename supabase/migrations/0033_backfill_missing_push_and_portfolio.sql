-- Bug: notifikasi push TIDAK PERNAH BERFUNGSI untuk siapa pun (bukan cuma
-- sebagian divisi) dan galeri Portfolio di halaman Ringkasan Magnativ SELALU
-- kosong serta tidak bisa ditambah foto. Root cause: tabel
-- `public.push_subscriptions` (migrasi 0002) dan `public.magnative_portfolio`
-- + bucket storage-nya (migrasi 0012) ternyata TIDAK PERNAH benar-benar
-- diterapkan ke database produksi — kemungkinan besar karena riwayat migrasi
-- yang lama dijalankan lewat SQL mentah (bukan lewat alur migrasi resmi) dan
-- kedua ini terlewat. Kode aplikasi sudah lama bergantung pada keduanya,
-- sehingga setiap percobaan "Aktifkan Notifikasi" & upload foto Portfolio
-- gagal secara diam-diam (query error ditangkap lalu jatuh ke nilai default).
--
-- Migrasi ini idempoten (create table/policy if not exists, on conflict do
-- nothing) dan hanya membuat ulang persis skema yang sudah dituliskan di
-- 0002_push_subscriptions.sql & 0012_magnative_portfolio.sql — sudah
-- diverifikasi hidup di produksi lewat list_tables sebelum file ini ditulis.

-- === dari 0002_push_subscriptions.sql ===
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Pengguna bisa lihat subscription miliknya" on public.push_subscriptions;
create policy "Pengguna bisa lihat subscription miliknya"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "Pengguna bisa tambah subscription miliknya" on public.push_subscriptions;
create policy "Pengguna bisa tambah subscription miliknya"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Pengguna bisa hapus subscription miliknya" on public.push_subscriptions;
create policy "Pengguna bisa hapus subscription miliknya"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- === dari 0012_magnative_portfolio.sql ===
create table if not exists public.magnative_portfolio (
  id uuid primary key default gen_random_uuid(),
  photo_url text not null,
  storage_path text not null,
  title text not null,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.magnative_portfolio;
create trigger set_updated_at
  before update on public.magnative_portfolio
  for each row execute function public.set_updated_at();

alter table public.magnative_portfolio enable row level security;

drop policy if exists "magnative_portfolio_access" on public.magnative_portfolio;
create policy "magnative_portfolio_access"
  on public.magnative_portfolio for all
  to authenticated
  using (public.can_access_division('magnative'))
  with check (public.can_access_division('magnative'));

insert into storage.buckets (id, name, public)
values ('magnative-portfolio', 'magnative-portfolio', true)
on conflict (id) do nothing;

drop policy if exists "magnative_portfolio_read" on storage.objects;
create policy "magnative_portfolio_read"
  on storage.objects for select
  to public
  using (bucket_id = 'magnative-portfolio');

drop policy if exists "magnative_portfolio_insert" on storage.objects;
create policy "magnative_portfolio_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'magnative-portfolio' and public.can_access_division('magnative'));

drop policy if exists "magnative_portfolio_update" on storage.objects;
create policy "magnative_portfolio_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'magnative-portfolio' and public.can_access_division('magnative'))
  with check (bucket_id = 'magnative-portfolio' and public.can_access_division('magnative'));

drop policy if exists "magnative_portfolio_delete" on storage.objects;
create policy "magnative_portfolio_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'magnative-portfolio' and public.can_access_division('magnative'));
