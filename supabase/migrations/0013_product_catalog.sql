-- Katalog Produk terpusat ("CRM produk") — permintaan Owner: satu database
-- produk yang dipakai lintas Magnarent/Magnativ/Production, dengan dua
-- jalur pengisian data: (1) manual/import Excel lewat aplikasi, dan
-- (2) API eksternal (API key) supaya automation seperti n8n bisa push/pull
-- data produk otomatis (mis. dari file Excel yang diproses n8n).
--
-- Halaman ini HANYA untuk akses penuh (division 'all'), pola sama seperti
-- Piutang & Pendapatan / Klien Terpadu / Laporan / Aktivitas (migrasi
-- 0008-0012) — staf per divisi tetap pakai modul masing-masing (Inventaris
-- Magnarent, Material Production) untuk operasional sehari-hari; katalog
-- ini untuk data master & visibilitas lintas divisi di level Owner/Finance.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  division text not null default 'umum' check (division in ('magnarent', 'magnativ', 'production', 'umum')),
  category text not null default '',
  -- Unique tapi nullable — banyak produk lama mungkin tidak punya SKU.
  -- Dipakai sebagai kunci pencocokan saat import massal/API (upsert).
  sku text unique,
  price integer not null default 0,
  unit text not null default 'unit',
  stock integer not null default 0,
  supplier text,
  photo_url text,
  photo_storage_path text,
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.products;
create trigger set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;

-- Cuma akses penuh yang boleh baca/tulis lewat aplikasi (Supabase Auth
-- biasa, sesi staf yang login). Jalur API eksternal
-- (src/app/api/products/route.ts) pakai service role key yang melewati
-- RLS ini sepenuhnya — aksesnya dikunci terpisah lewat pengecekan API key
-- di kode Route Handler, bukan lewat RLS ini.
drop policy if exists "products_access_full" on public.products;
create policy "products_access_full"
  on public.products for all
  to authenticated
  using (public.current_user_division() = 'all')
  with check (public.current_user_division() = 'all');

-- Bucket foto produk — pola sama persis dengan magnative-portfolio (migrasi 0012).
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

drop policy if exists "product_photos_read" on storage.objects;
create policy "product_photos_read"
  on storage.objects for select
  to public
  using (bucket_id = 'product-photos');

drop policy if exists "product_photos_insert" on storage.objects;
create policy "product_photos_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-photos' and public.current_user_division() = 'all');

drop policy if exists "product_photos_update" on storage.objects;
create policy "product_photos_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-photos' and public.current_user_division() = 'all')
  with check (bucket_id = 'product-photos' and public.current_user_division() = 'all');

drop policy if exists "product_photos_delete" on storage.objects;
create policy "product_photos_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-photos' and public.current_user_division() = 'all');
