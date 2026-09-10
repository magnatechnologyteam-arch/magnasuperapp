-- Tahap 28c: 4 fitur baru Production yang dipilih Owner —
-- (1) checklist instalasi & bongkar + foto per proyek booth,
-- (2) penugasan kru per proyek booth,
-- (3) galeri dokumentasi before/after per proyek booth,
-- (4) riwayat pemakaian alat berat/perkakas.
--
-- Pola SENGAJA disamakan dengan Tahap 28a (Magnarent, migrasi 0025) dan
-- Tahap 28b (Magnativ, migrasi 0026): semua tabel baru di sini BERDIRI
-- SENDIRI, terpisah dari `production_booth_projects`/`production_materials`
-- yang sudah teruji (termasuk RPC `save_booth_project_checked` dari migrasi
-- 0020) — supaya RPC itu tidak perlu disentuh sama sekali. "Kru" di sini
-- SENGAJA disimpan sebagai nama bebas (bukan menautkan ke `profiles`),
-- karena RLS `profiles` sejak migrasi 0003 membatasi tiap akun cuma bisa
-- membaca baris profilnya sendiri (kecuali division 'all') — menautkan ke
-- akun staf lain akan butuh melonggarkan RLS `profiles` lintas pengguna,
-- perubahan keamanan yang di luar cakupan 4 fitur ini.

-- (1) Checklist instalasi & bongkar + foto -----------------------------------
create table if not exists public.production_project_checks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.production_booth_projects (id) on delete cascade,
  stage text not null check (stage in ('instalasi', 'bongkar')),
  catatan text,
  photo_urls text[] not null default '{}',
  photo_storage_paths text[] not null default '{}',
  checked_by uuid references public.profiles (id) on delete set null,
  checked_at timestamptz not null default now(),
  unique (project_id, stage)
);

alter table public.production_project_checks enable row level security;

drop policy if exists "production_project_checks_access" on public.production_project_checks;
create policy "production_project_checks_access"
  on public.production_project_checks for all
  to authenticated
  using (public.can_access_division('production'))
  with check (public.can_access_division('production'));

insert into storage.buckets (id, name, public)
values ('production-checks', 'production-checks', true)
on conflict (id) do nothing;

drop policy if exists "production_checks_read" on storage.objects;
create policy "production_checks_read"
  on storage.objects for select
  to public
  using (bucket_id = 'production-checks');

drop policy if exists "production_checks_insert" on storage.objects;
create policy "production_checks_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'production-checks' and public.can_access_division('production'));

drop policy if exists "production_checks_update" on storage.objects;
create policy "production_checks_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'production-checks' and public.can_access_division('production'))
  with check (bucket_id = 'production-checks' and public.can_access_division('production'));

drop policy if exists "production_checks_delete" on storage.objects;
create policy "production_checks_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'production-checks' and public.can_access_division('production'));

-- (2) Penugasan kru per proyek booth ------------------------------------------
create table if not exists public.production_project_crew (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.production_booth_projects (id) on delete cascade,
  nama text not null,
  peran text not null default 'Lainnya'
    check (peran in ('Koordinator Lapangan', 'Tukang/Instalatur', 'Desainer', 'Sopir/Logistik', 'Lainnya')),
  kontak text,
  catatan text,
  created_at timestamptz not null default now()
);

alter table public.production_project_crew enable row level security;

drop policy if exists "production_project_crew_access" on public.production_project_crew;
create policy "production_project_crew_access"
  on public.production_project_crew for all
  to authenticated
  using (public.can_access_division('production'))
  with check (public.can_access_division('production'));

-- (3) Galeri dokumentasi before/after per proyek booth ------------------------
create table if not exists public.production_project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.production_booth_projects (id) on delete cascade,
  tahap text not null check (tahap in ('Sebelum', 'Sesudah')),
  photo_url text not null,
  storage_path text not null,
  caption text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.production_project_photos enable row level security;

drop policy if exists "production_project_photos_access" on public.production_project_photos;
create policy "production_project_photos_access"
  on public.production_project_photos for all
  to authenticated
  using (public.can_access_division('production'))
  with check (public.can_access_division('production'));

insert into storage.buckets (id, name, public)
values ('production-documentation', 'production-documentation', true)
on conflict (id) do nothing;

drop policy if exists "production_documentation_read" on storage.objects;
create policy "production_documentation_read"
  on storage.objects for select
  to public
  using (bucket_id = 'production-documentation');

drop policy if exists "production_documentation_insert" on storage.objects;
create policy "production_documentation_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'production-documentation' and public.can_access_division('production'));

drop policy if exists "production_documentation_update" on storage.objects;
create policy "production_documentation_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'production-documentation' and public.can_access_division('production'))
  with check (bucket_id = 'production-documentation' and public.can_access_division('production'));

drop policy if exists "production_documentation_delete" on storage.objects;
create policy "production_documentation_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'production-documentation' and public.can_access_division('production'));

-- (4) Alat berat/perkakas + riwayat pemakaian ---------------------------------
create table if not exists public.production_equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kategori text not null default 'Lainnya'
    check (kategori in ('Alat Berat', 'Perkakas Listrik', 'Perkakas Manual', 'Lainnya')),
  kondisi text not null default 'Baik' check (kondisi in ('Baik', 'Perlu Servis', 'Rusak')),
  catatan text,
  created_at timestamptz not null default now()
);

alter table public.production_equipment enable row level security;

drop policy if exists "production_equipment_access" on public.production_equipment;
create policy "production_equipment_access"
  on public.production_equipment for all
  to authenticated
  using (public.can_access_division('production'))
  with check (public.can_access_division('production'));

-- `project_id` boleh kosong (alat dipakai bukan untuk proyek booth
-- tertentu, mis. beres-beres gudang) dan `on delete set null` supaya
-- riwayat pemakaian tidak ikut hilang kalau proyeknya dihapus.
create table if not exists public.production_equipment_usage (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.production_equipment (id) on delete cascade,
  project_id uuid references public.production_booth_projects (id) on delete set null,
  digunakan_oleh text not null,
  tanggal_pinjam date not null default current_date,
  tanggal_kembali date,
  catatan text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.production_equipment_usage enable row level security;

drop policy if exists "production_equipment_usage_access" on public.production_equipment_usage;
create policy "production_equipment_usage_access"
  on public.production_equipment_usage for all
  to authenticated
  using (public.can_access_division('production'))
  with check (public.can_access_division('production'));
