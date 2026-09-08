-- Galeri portofolio Magnativ (item 8, perbaikan teks & fitur sesi ini) —
-- menggantikan PlaceholderGallery statis di halaman Ringkasan Magnativ
-- dengan foto sungguhan yang bisa ditambah/diedit staf lewat aplikasi.
-- Foto disimpan di Supabase Storage (bucket "magnative-portfolio", public
-- supaya bisa ditampilkan langsung lewat <Image> tanpa signed URL), dan
-- baris di tabel ini menyimpan metadatanya (judul, keterangan, path file).

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
create trigger set_updated_at before update on public.magnative_portfolio
  for each row execute function public.set_updated_at();

alter table public.magnative_portfolio enable row level security;

drop policy if exists "magnative_portfolio_access" on public.magnative_portfolio;
create policy "magnative_portfolio_access"
  on public.magnative_portfolio for all
  to authenticated
  using (public.can_access_division('magnative'))
  with check (public.can_access_division('magnative'));

-- Bucket public — foto portofolio memang ditujukan untuk ditampilkan
-- langsung di halaman, bukan data sensitif seperti dokumen internal.
insert into storage.buckets (id, name, public)
values ('magnative-portfolio', 'magnative-portfolio', true)
on conflict (id) do nothing;

-- Baca: siapa saja (termasuk publik/anon) boleh me-load foto lewat URL
-- publiknya — ini yang bikin <Image src="...supabase.co/storage/..."> bisa
-- tampil tanpa perlu signed URL/auth header.
drop policy if exists "magnative_portfolio_read" on storage.objects;
create policy "magnative_portfolio_read"
  on storage.objects for select
  to public
  using (bucket_id = 'magnative-portfolio');

-- Tulis (upload/ubah/hapus file): dibatasi ke akun yang punya akses divisi
-- Magnative (atau akses penuh), pola sama seperti tabel-tabel modul lain.
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
