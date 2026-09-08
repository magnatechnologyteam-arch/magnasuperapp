-- Migrasi data modul Magnative (klien, proyek, konten sosial media) dari
-- mock data di memori (src/lib/magnative/mock-data.ts) ke tabel Supabase —
-- pola persis sama dengan migrasi Magnarent (0004): helper
-- `can_access_division`/`set_updated_at` sudah dibuat di sana dan dipakai
-- ulang di sini, tidak perlu didefinisikan lagi.

create table if not exists public.magnative_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text not null,
  pic_name text not null,
  pic_phone text,
  pic_email text,
  status text not null default 'Prospek' check (status in ('Prospek', 'Aktif', 'Selesai', 'Tidak Lanjut')),
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- `client_id` nullable + ON DELETE SET NULL (bukan RESTRICT) — sama seperti
-- `item_id` di magnarent_bookings (migrasi 0004): klien boleh dihapus meski
-- masih disebut proyek yang SUDAH SELESAI/DIBATALKAN (histori tetap ada, UI
-- sudah fallback "—" untuk klien yang hilang — lihat `clientName` di
-- ProjectManager.tsx). Proyek AKTIF (Perencanaan/Berjalan) tetap diblokir
-- di level aplikasi (`deleteClient` di actions.ts).
create table if not exists public.magnative_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.magnative_clients (id) on delete set null,
  name text not null,
  type text not null check (type in ('Event Organizer', 'Creative Agency', 'Media Sosial', 'Lainnya')),
  tanggal_mulai date not null,
  tanggal_selesai date not null,
  budget integer not null default 0,
  status text not null default 'Perencanaan' check (status in ('Perencanaan', 'Berjalan', 'Selesai', 'Dibatalkan')),
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- `client_id` di sini SUDAH nullable dari desain awal (konten boleh
-- "Internal", tidak atas nama klien manapun) — ON DELETE SET NULL pas
-- persis dengan makna itu.
create table if not exists public.magnative_content_posts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.magnative_clients (id) on delete set null,
  title text not null,
  platform text not null check (platform in ('Instagram', 'TikTok', 'Facebook', 'YouTube', 'LinkedIn', 'Lainnya')),
  tanggal_posting date not null,
  status text not null default 'Draft' check (status in ('Draft', 'Review', 'Terjadwal', 'Tayang')),
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.magnative_clients;
create trigger set_updated_at before update on public.magnative_clients
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.magnative_projects;
create trigger set_updated_at before update on public.magnative_projects
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.magnative_content_posts;
create trigger set_updated_at before update on public.magnative_content_posts
  for each row execute function public.set_updated_at();

alter table public.magnative_clients enable row level security;
alter table public.magnative_projects enable row level security;
alter table public.magnative_content_posts enable row level security;

drop policy if exists "magnative_clients_access" on public.magnative_clients;
create policy "magnative_clients_access"
  on public.magnative_clients for all
  to authenticated
  using (public.can_access_division('magnative'))
  with check (public.can_access_division('magnative'));

drop policy if exists "magnative_projects_access" on public.magnative_projects;
create policy "magnative_projects_access"
  on public.magnative_projects for all
  to authenticated
  using (public.can_access_division('magnative'))
  with check (public.can_access_division('magnative'));

drop policy if exists "magnative_content_posts_access" on public.magnative_content_posts;
create policy "magnative_content_posts_access"
  on public.magnative_content_posts for all
  to authenticated
  using (public.can_access_division('magnative'))
  with check (public.can_access_division('magnative'));

-- Seed data — persis sama dengan INITIAL_CLIENTS/INITIAL_PROJECTS/
-- INITIAL_CONTENT_POSTS lama di mock-data.ts, supaya tampilan di aplikasi
-- tidak berubah begitu migrasi ini jalan.
insert into public.magnative_clients (id, name, industry, pic_name, pic_phone, pic_email, status) values
  ('c0000000-0000-4000-8000-000000000001', 'PT Nusantara Digital', 'Teknologi', 'Rangga Prasetyo', '0813-1111-2222', 'rangga@nusantaradigital.co.id', 'Aktif'),
  ('c0000000-0000-4000-8000-000000000002', 'Bank Mitra Sejahtera', 'Perbankan', 'Sari Wulandari', '0812-3333-4444', 'sari.w@mitrasejahtera.co.id', 'Aktif'),
  ('c0000000-0000-4000-8000-000000000003', 'Kopi Kenangan Lokal', 'F&B', 'Dimas Anugrah', '0857-5555-6666', null, 'Prospek'),
  ('c0000000-0000-4000-8000-000000000004', 'Yayasan Peduli Anak', 'Non-Profit', 'Retno Ambarwati', '0821-7777-8888', 'retno@pedulianak.org', 'Selesai')
on conflict (id) do nothing;

insert into public.magnative_projects (id, client_id, name, type, tanggal_mulai, tanggal_selesai, budget, status) values
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Product Launch Nusantara App v2', 'Event Organizer', '2026-09-20', '2026-09-20', 350000000, 'Perencanaan'),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'Rebranding Visual Identity 2026', 'Creative Agency', '2026-08-15', '2026-10-01', 220000000, 'Berjalan'),
  ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000004', 'Gala Dinner Amal Tahunan', 'Event Organizer', '2026-07-10', '2026-07-10', 180000000, 'Selesai'),
  ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001', 'Konten Bulanan Media Sosial', 'Media Sosial', '2026-09-01', '2026-09-30', 45000000, 'Berjalan')
on conflict (id) do nothing;

insert into public.magnative_content_posts (id, client_id, title, platform, tanggal_posting, status) values
  ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Teaser Product Launch', 'Instagram', '2026-09-15', 'Terjadwal'),
  ('e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'Behind the Scenes Kantor', 'TikTok', '2026-09-10', 'Draft'),
  ('e0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000002', 'Pengumuman Logo Baru', 'LinkedIn', '2026-09-08', 'Review'),
  ('e0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000003', 'Promo Pembukaan Cabang', 'Instagram', '2026-09-05', 'Tayang')
on conflict (id) do nothing;
