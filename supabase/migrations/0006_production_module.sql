-- Migrasi data modul Production (material gudang + proyek booth) dari mock
-- data di memori (src/lib/production/mock-data.ts) ke tabel Supabase —
-- pola sama dengan migrasi Magnarent (0004) dan Magnative (0005). Helper
-- `can_access_division`/`set_updated_at` dipakai ulang dari migrasi 0004.
--
-- Alokasi material tiap proyek booth (dulu `materials: MaterialUsage[]` di
-- memori) disimpan sebagai kolom `jsonb`, BUKAN tabel relasi terpisah —
-- lebih sederhana untuk bentuk data "daftar {materialId, qty}" ini, dan
-- pengecekan ketersediaan stok tetap dihitung di aplikasi (dari
-- src/lib/production/availability.ts, tidak berubah) setelah datanya
-- diambil dari sini, sama seperti pola lama saat masih di React state.

create table if not exists public.production_materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('Kayu & Panel', 'Cat & Finishing', 'Hardware & Rangka', 'Elektrikal', 'Lainnya')),
  unit text not null check (unit in ('pcs', 'lembar', 'batang', 'meter', 'kg', 'liter', 'set')),
  location text not null,
  stock integer not null default 0,
  min_stock integer not null default 0,
  price_per_unit integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_booth_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nama_klien text not null,
  lokasi_acara text not null,
  status text not null default 'Desain' check (status in ('Desain', 'Produksi', 'Finishing', 'Instalasi', 'Selesai', 'Dibatalkan')),
  tanggal_mulai date not null,
  tanggal_instalasi date not null,
  budget integer not null default 0,
  -- Bentuk: [{"materialId": "<uuid production_materials.id>", "qty": <int>}, ...]
  materials jsonb not null default '[]'::jsonb,
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.production_materials;
create trigger set_updated_at before update on public.production_materials
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.production_booth_projects;
create trigger set_updated_at before update on public.production_booth_projects
  for each row execute function public.set_updated_at();

alter table public.production_materials enable row level security;
alter table public.production_booth_projects enable row level security;

drop policy if exists "production_materials_access" on public.production_materials;
create policy "production_materials_access"
  on public.production_materials for all
  to authenticated
  using (public.can_access_division('production'))
  with check (public.can_access_division('production'));

drop policy if exists "production_booth_projects_access" on public.production_booth_projects;
create policy "production_booth_projects_access"
  on public.production_booth_projects for all
  to authenticated
  using (public.can_access_division('production'))
  with check (public.can_access_division('production'));

-- Seed data — persis sama dengan INITIAL_MATERIALS/INITIAL_BOOTH_PROJECTS
-- lama di mock-data.ts, supaya tampilan di aplikasi tidak berubah begitu
-- migrasi ini jalan.
insert into public.production_materials (id, name, category, unit, location, stock, min_stock, price_per_unit) values
  ('f0000000-0000-4000-8000-000000000001', 'Multiplek 18mm', 'Kayu & Panel', 'lembar', 'Gudang Cikarang', 120, 30, 285000),
  ('f0000000-0000-4000-8000-000000000002', 'Cat Duco Putih', 'Cat & Finishing', 'liter', 'Gudang Pusat', 18, 20, 165000),
  ('f0000000-0000-4000-8000-000000000003', 'Hollow Besi 4x4', 'Hardware & Rangka', 'batang', 'Gudang Cikarang', 60, 15, 95000),
  ('f0000000-0000-4000-8000-000000000004', 'Lampu LED Strip', 'Elektrikal', 'meter', 'Gudang Pusat', 40, 25, 45000),
  ('f0000000-0000-4000-8000-000000000005', 'Baut & Mur Set', 'Hardware & Rangka', 'set', 'Gudang Pusat', 200, 50, 12000),
  ('f0000000-0000-4000-8000-000000000006', 'Vinyl Sticker Print', 'Cat & Finishing', 'meter', 'Gudang Pusat', 45, 10, 75000)
on conflict (id) do nothing;

insert into public.production_booth_projects (id, name, nama_klien, lokasi_acara, status, tanggal_mulai, tanggal_instalasi, budget, materials, catatan) values
  ('a1000000-0000-4000-8000-000000000001', 'Booth Pameran IIMS 2026', 'PT Auto Perkasa', 'JIExpo Kemayoran', 'Produksi', '2026-08-25', '2026-09-14', 185000000,
    '[{"materialId":"f0000000-0000-4000-8000-000000000001","qty":40},{"materialId":"f0000000-0000-4000-8000-000000000003","qty":20},{"materialId":"f0000000-0000-4000-8000-000000000002","qty":10}]'::jsonb, null),
  ('a1000000-0000-4000-8000-000000000002', 'Booth Retail Kopi Kenangan Lokal', 'Kopi Kenangan Lokal', 'Mall Kelapa Gading', 'Desain', '2026-09-05', '2026-09-25', 65000000,
    '[{"materialId":"f0000000-0000-4000-8000-000000000001","qty":15},{"materialId":"f0000000-0000-4000-8000-000000000006","qty":20}]'::jsonb, null),
  ('a1000000-0000-4000-8000-000000000003', 'Booth Corporate Bank Mitra Sejahtera', 'Bank Mitra Sejahtera', 'Ballroom Ritz-Carlton Jakarta', 'Finishing', '2026-08-15', '2026-09-10', 220000000,
    '[{"materialId":"f0000000-0000-4000-8000-000000000001","qty":30},{"materialId":"f0000000-0000-4000-8000-000000000003","qty":25},{"materialId":"f0000000-0000-4000-8000-000000000004","qty":15},{"materialId":"f0000000-0000-4000-8000-000000000005","qty":40}]'::jsonb, null),
  ('a1000000-0000-4000-8000-000000000004', 'Booth Festival Kuliner Nusantara', 'Yayasan Peduli Anak', 'GBK Senayan', 'Selesai', '2026-07-20', '2026-08-05', 40000000,
    '[{"materialId":"f0000000-0000-4000-8000-000000000001","qty":10},{"materialId":"f0000000-0000-4000-8000-000000000002","qty":5}]'::jsonb, null),
  ('a1000000-0000-4000-8000-000000000005', 'Booth Konser Amal Kota', 'Konser Amal Kota', 'ICE BSD City', 'Dibatalkan', '2026-09-01', '2026-09-20', 30000000,
    '[]'::jsonb, 'Dibatalkan klien karena perubahan anggaran acara.')
on conflict (id) do nothing;
