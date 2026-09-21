begin;

-- Update Opsional 1, item 5 — restrukturisasi portofolio Magnativ dari
-- "1 baris tabel = 1 foto" (migrasi 0012) jadi model FOLDER/ALBUM ("1
-- folder = banyak foto"), supaya satu folder porto bisa diisi beberapa
-- foto sekaligus dan ditampilkan sebagai slide. Item 5 juga minta
-- portofolio "tampil di keseluruhan agar semua divisi bisa melihat" —
-- jadi SELECT dibuka ke semua divisi yang login (pola sama persis dengan
-- katalog produk lintas-divisi di migrasi 0048), sementara
-- tulis/kelola (tambah/edit/hapus folder & foto) TETAP dibatasi ke staf
-- Magnativ (atau akses penuh) seperti sebelumnya — divisi lain cuma
-- melihat, tidak ikut mengelola.

create table if not exists public.magnative_portfolio_folders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.magnative_portfolio_folders;
create trigger set_updated_at before update on public.magnative_portfolio_folders
  for each row execute function public.set_updated_at();

-- Migrasi data lama: tiap foto yang sudah ada jadi SATU FOLDER isi 1 foto
-- (judul & keterangan foto lama jadi judul & keterangan foldernya), pakai
-- id yang sama supaya tidak perlu tabel pemetaan terpisah.
insert into public.magnative_portfolio_folders (id, title, caption, created_at, updated_at)
select id, title, caption, created_at, updated_at from public.magnative_portfolio
on conflict (id) do nothing;

alter table public.magnative_portfolio
  add column if not exists folder_id uuid references public.magnative_portfolio_folders(id) on delete cascade,
  add column if not exists position integer not null default 0;

update public.magnative_portfolio set folder_id = id where folder_id is null;

alter table public.magnative_portfolio alter column folder_id set not null;
alter table public.magnative_portfolio drop column if exists title;
alter table public.magnative_portfolio drop column if exists caption;

create index if not exists magnative_portfolio_folder_id_idx on public.magnative_portfolio (folder_id);

alter table public.magnative_portfolio_folders enable row level security;

drop policy if exists "magnative_portfolio_folders_select" on public.magnative_portfolio_folders;
create policy "magnative_portfolio_folders_select"
  on public.magnative_portfolio_folders for select
  to authenticated
  using (true);

drop policy if exists "magnative_portfolio_folders_insert" on public.magnative_portfolio_folders;
create policy "magnative_portfolio_folders_insert"
  on public.magnative_portfolio_folders for insert
  to authenticated
  with check (public.can_access_division('magnative'));

drop policy if exists "magnative_portfolio_folders_update" on public.magnative_portfolio_folders;
create policy "magnative_portfolio_folders_update"
  on public.magnative_portfolio_folders for update
  to authenticated
  using (public.can_access_division('magnative'))
  with check (public.can_access_division('magnative'));

drop policy if exists "magnative_portfolio_folders_delete" on public.magnative_portfolio_folders;
create policy "magnative_portfolio_folders_delete"
  on public.magnative_portfolio_folders for delete
  to authenticated
  using (public.can_access_division('magnative'));

-- Ganti policy "for all" lama (division-gated baca+tulis) di tabel foto
-- dengan SELECT terbuka + tulis tetap Magnativ-only.
drop policy if exists "magnative_portfolio_access" on public.magnative_portfolio;
drop policy if exists "magnative_portfolio_select_investor" on public.magnative_portfolio;

drop policy if exists "magnative_portfolio_select" on public.magnative_portfolio;
create policy "magnative_portfolio_select"
  on public.magnative_portfolio for select
  to authenticated
  using (true);

drop policy if exists "magnative_portfolio_insert" on public.magnative_portfolio;
create policy "magnative_portfolio_insert"
  on public.magnative_portfolio for insert
  to authenticated
  with check (public.can_access_division('magnative'));

drop policy if exists "magnative_portfolio_update" on public.magnative_portfolio;
create policy "magnative_portfolio_update"
  on public.magnative_portfolio for update
  to authenticated
  using (public.can_access_division('magnative'))
  with check (public.can_access_division('magnative'));

drop policy if exists "magnative_portfolio_delete" on public.magnative_portfolio;
create policy "magnative_portfolio_delete"
  on public.magnative_portfolio for delete
  to authenticated
  using (public.can_access_division('magnative'));

commit;
