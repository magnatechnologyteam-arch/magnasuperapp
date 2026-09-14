-- Tahap 29: "banyak foto per produk (slider)" + impor produk dari WhatsApp
-- Business Catalog (Meta Graph API) & website Magna lainnya, plus katalog
-- produk jadi bisa DILIHAT (read-only) oleh semua staf yang login — bukan
-- cuma Owner/Finance seperti sebelumnya (migrasi 0013) — supaya tim tiap
-- divisi bisa cek apakah suatu barang sudah ada di list & lihat detail
-- gambarnya, sementara TULIS (tambah/edit/hapus/impor) tetap cuma
-- Owner/Finance (division 'all'), sama seperti sebelumnya.

-- ---------------------------------------------------------------------
-- 1) Galeri foto per produk (menggantikan model "1 produk = 1 foto")
-- ---------------------------------------------------------------------
create table if not exists public.product_photos (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  photo_url text not null,
  -- Null kalau foto berasal dari sumber EKSTERNAL (WhatsApp Catalog /
  -- website) — kita tidak meng-copy file itu ke Storage sendiri, cuma
  -- menyimpan URL-nya, jadi tidak ada objek Storage yang perlu dihapus
  -- untuk foto seperti ini.
  storage_path text,
  source text not null default 'upload' check (source in ('upload', 'whatsapp_catalog', 'website')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_photos_product_id_idx on public.product_photos (product_id, sort_order);

-- Backfill: foto yang sudah ada di `products.photo_url` (pola lama) jadi
-- foto pertama di galeri masing-masing produk, supaya tidak ada foto yang
-- hilang saat migrasi ke model baru.
insert into public.product_photos (product_id, photo_url, storage_path, source, sort_order)
select id, photo_url, photo_storage_path, 'upload', 0
from public.products
where photo_url is not null
  and not exists (select 1 from public.product_photos pp where pp.product_id = products.id);

alter table public.product_photos enable row level security;

-- Baca: SEMUA staf yang login (permintaan: "tim bisa lihat detail gambar
-- produk") — beda dari kebijakan `products` sebelumnya yang cuma Owner/
-- Finance.
drop policy if exists "product_photos_read_all_staff" on public.product_photos;
create policy "product_photos_read_all_staff"
  on public.product_photos for select
  to authenticated
  using (true);

drop policy if exists "product_photos_write_full_access" on public.product_photos;
create policy "product_photos_write_full_access"
  on public.product_photos for all
  to authenticated
  using (public.current_user_division() = 'all')
  with check (public.current_user_division() = 'all');

-- ---------------------------------------------------------------------
-- 2) Lebarkan akses BACA `products` ke semua staf login (tulis tetap
--    cuma division 'all', sama seperti sebelumnya) — kebijakan lama
--    "products_access_full" digabung jadi dua kebijakan terpisah supaya
--    baca & tulis bisa beda syarat.
-- ---------------------------------------------------------------------
drop policy if exists "products_access_full" on public.products;

drop policy if exists "products_read_all_staff" on public.products;
create policy "products_read_all_staff"
  on public.products for select
  to authenticated
  using (true);

drop policy if exists "products_write_full_access" on public.products;
create policy "products_write_full_access"
  on public.products for all
  to authenticated
  using (public.current_user_division() = 'all')
  with check (public.current_user_division() = 'all');

-- ---------------------------------------------------------------------
-- 3) Penanda produk yang berasal dari impor eksternal — kunci upsert yang
--    stabil untuk sinkronisasi berulang, terpisah dari SKU (yang tetap
--    dipakai untuk import Excel/CSV manual dan boleh kosong/berubah).
-- ---------------------------------------------------------------------
alter table public.products
  add column if not exists external_source text check (external_source in ('whatsapp_catalog', 'website')),
  add column if not exists external_ref text;

create unique index if not exists products_external_ref_idx
  on public.products (external_source, external_ref)
  where external_ref is not null;

-- ---------------------------------------------------------------------
-- 4) Daftar sumber impor yang dikonfigurasi admin (supaya bisa "Sinkron
--    Sekarang" kapan saja tanpa developer) — token/kredensial rahasia
--    (mis. access token WhatsApp Business Platform) SENGAJA TIDAK
--    disimpan di sini, cuma di environment variable server
--    (`META_CATALOG_ACCESS_TOKEN`), supaya tidak pernah lewat database
--    atau kelihatan di UI.
-- ---------------------------------------------------------------------
create table if not exists public.product_import_sources (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('whatsapp_catalog', 'website')),
  label text not null,
  -- type='website': URL halaman produk yang akan diambil datanya.
  -- type='whatsapp_catalog': Catalog ID dari Meta Commerce Manager (BUKAN
  -- rahasia, cuma pengenal katalog).
  reference text not null,
  last_synced_at timestamptz,
  last_sync_summary jsonb,
  created_at timestamptz not null default now()
);

alter table public.product_import_sources enable row level security;

drop policy if exists "product_import_sources_full_access" on public.product_import_sources;
create policy "product_import_sources_full_access"
  on public.product_import_sources for all
  to authenticated
  using (public.current_user_division() = 'all')
  with check (public.current_user_division() = 'all');
