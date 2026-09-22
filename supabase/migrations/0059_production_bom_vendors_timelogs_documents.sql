-- Tahap 44: 4 fitur tambahan Production tanpa bahan eksternal (lihat
-- analisis-gap-production.md) -- template BOM per tipe booth, database
-- vendor/supplier, jam kerja kru (internal), dan lampiran gambar
-- kerja/desain per proyek. Semua tabel baru murni ADDITIVE, tidak
-- menyentuh production_materials/production_booth_projects/RPC
-- save_booth_project_checked yang sudah teruji.

-- 1) Template BOM per tipe booth -- resep alokasi material yang bisa
-- "dimuat ulang" ke form proyek baru, supaya tidak input dari nol tiap
-- kali. items disimpan jsonb array {materialId, qty} -- pola sama
-- persis dengan kolom materials di production_booth_projects.
create table public.production_bom_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.production_bom_templates
  for each row execute function public.set_updated_at();

alter table public.production_bom_templates enable row level security;
create policy production_bom_templates_select on public.production_bom_templates
  for select using (can_access_division('production') or current_user_is_investor());
create policy production_bom_templates_insert on public.production_bom_templates
  for insert with check (can_access_division('production'));
create policy production_bom_templates_update on public.production_bom_templates
  for update using (can_access_division('production')) with check (can_access_division('production'));
create policy production_bom_templates_delete on public.production_bom_templates
  for delete using (can_access_division('production'));

-- 2) Database vendor/supplier -- mirror pola magnative_vendors (migrasi
-- 0026), tapi lewat 4 policy terpisah + akses baca investor supaya
-- konsisten dengan tabel Production lain (production_materials/
-- production_purchase_orders), bukan satu policy ALL seperti Magnativ.
create table public.production_vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Lainnya',
  contact_name text,
  contact_phone text,
  contact_email text,
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.production_vendors
  for each row execute function public.set_updated_at();

alter table public.production_vendors enable row level security;
create policy production_vendors_select on public.production_vendors
  for select using (can_access_division('production') or current_user_is_investor());
create policy production_vendors_insert on public.production_vendors
  for insert with check (can_access_division('production'));
create policy production_vendors_update on public.production_vendors
  for update using (can_access_division('production')) with check (can_access_division('production'));
create policy production_vendors_delete on public.production_vendors
  for delete using (can_access_division('production'));

-- Kaitkan PO ke vendor master data (opsional -- PO lama/tanpa vendor
-- terdaftar tetap pakai supplier_name teks bebas, tidak wajib diisi).
alter table public.production_purchase_orders
  add column vendor_id uuid references public.production_vendors(id) on delete set null;

-- 3) Jam kerja kru (internal) -- banyak baris per penugasan kru
-- (production_project_crew), murni pencatatan jam untuk kebutuhan
-- profitabilitas proyek versi internal (belum terhubung payroll).
create table public.production_crew_timelogs (
  id uuid primary key default gen_random_uuid(),
  project_crew_id uuid not null references public.production_project_crew(id) on delete cascade,
  tanggal date not null,
  jam numeric(5,2) not null check (jam > 0),
  catatan text,
  created_at timestamptz not null default now()
);

create index production_crew_timelogs_crew_idx on public.production_crew_timelogs(project_crew_id);

alter table public.production_crew_timelogs enable row level security;

create policy production_crew_timelogs_access on public.production_crew_timelogs
  for all using (can_access_division('production')) with check (can_access_division('production'));
-- 4) Lampiran gambar kerja/desain per proyek -- pola sama dengan
-- production_project_photos (migrasi 0027), tapi untuk dokumen kerja
-- (gambar/PDF), bukan foto before/after instalasi.
create table public.production_project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.production_booth_projects(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  storage_path text not null,
  file_type text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index production_project_documents_project_idx on public.production_project_documents(project_id);

alter table public.production_project_documents enable row level security;

create policy production_project_documents_access on public.production_project_documents
  for all using (can_access_division('production')) with check (can_access_division('production'));
-- Bucket Storage untuk gambar kerja/desain -- pola sama persis dengan
-- production-documentation (migrasi 0027): publik-baca, tulis dibatasi
-- divisi Production.
insert into storage.buckets (id, name, public)
values ('production-drawings', 'production-drawings', true)
on conflict (id) do nothing;

create policy production_drawings_read on storage.objects
  for select using (bucket_id = 'production-drawings');
create policy production_drawings_insert on storage.objects
  for insert with check (bucket_id = 'production-drawings' and can_access_division('production'));
create policy production_drawings_update on storage.objects
  for update using (bucket_id = 'production-drawings' and can_access_division('production'))
  with check (bucket_id = 'production-drawings' and can_access_division('production'));
create policy production_drawings_delete on storage.objects
  for delete using (bucket_id = 'production-drawings' and can_access_division('production'));
