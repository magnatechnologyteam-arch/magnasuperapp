-- Tahap A dari modul baru "Tracking Progress Event" (ceklis running event,
-- permintaan Owner) -- hasil diskusi panjang: beda dari modul lain yang
-- akses tetap disekat per divisi, modul ini SENGAJA lintas divisi penuh
-- (Magnarent/Magnativ/Production) karena semangatnya "satu tim, satu
-- event" -- begitu event dibuat, ketiga divisi bisa saling lihat & bantu
-- kerjaan, bukan cuma dapat notifikasi doang.
--
-- Struktur inti:
--  - event_types + event_type_template_items: daftar jenis event (bisa
--    terus ditambah Admin, mis. "KOL Gathering") beserta template
--    checklist standarnya (kategori + item) -- dipakai supaya event baru
--    yang sejenis tidak perlu ngetik ulang checklist dari nol.
--  - events: record event baru berdiri sendiri (BUKAN menempel ke satu
--    proyek divisi tertentu) -- satu event bisa melibatkan pekerjaan dari
--    ketiga divisi sekaligus.
--  - event_links: kaitan opsional dari satu event ke booking Magnarent /
--    proyek Magnativ / proyek booth Production yang sudah ada -- supaya
--    konteksnya nyambung ke data yang sudah dicatat tiap divisi, dan jadi
--    dasar akses baca lintas-divisi (lihat kebijakan di bawah).
--  - event_checklist_items: checklist AKTUAL satu event (hasil clone dari
--    template saat event dibuat, lalu bebas disesuaikan) -- tiap item
--    dilacak lewat status 5-tahap (Sample -> Approval -> Preparation ->
--    Production -> Finish) dan PIC (staf terdaftar, BUKAN nama bebas,
--    supaya notifikasi & akuntabilitas jelas).

create table if not exists public.event_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.event_types;
create trigger set_updated_at before update on public.event_types
  for each row execute function public.set_updated_at();

alter table public.event_types enable row level security;

-- Baca: ketiga divisi operasional + akses penuh (supaya kelihatan waktu
-- bikin event baru). Ubah: cuma akses penuh (Owner/Finance) yang kelola
-- daftar jenis event -- konsisten dengan Daftar Akun di modul Akuntansi.
drop policy if exists "event_types_select" on public.event_types;
create policy "event_types_select"
  on public.event_types for select
  to authenticated
  using (public.current_user_division() in ('magnarent', 'magnative', 'production', 'all'));

drop policy if exists "event_types_insert" on public.event_types;
create policy "event_types_insert"
  on public.event_types for insert
  to authenticated
  with check (public.current_user_division() = 'all');

drop policy if exists "event_types_update" on public.event_types;
create policy "event_types_update"
  on public.event_types for update
  to authenticated
  using (public.current_user_division() = 'all')
  with check (public.current_user_division() = 'all');

drop policy if exists "event_types_delete" on public.event_types;
create policy "event_types_delete"
  on public.event_types for delete
  to authenticated
  using (public.current_user_division() = 'all');

-- Template checklist per jenis event -- baris per item (kategori, nama
-- item, detail, qty/durasi, keterangan), di-clone jadi event_checklist_items
-- waktu event baru dibuat dari jenis ini.
create table if not exists public.event_type_template_items (
  id uuid primary key default gen_random_uuid(),
  event_type_id uuid not null references public.event_types (id) on delete cascade,
  category text not null,
  item_name text not null,
  detail text,
  qty_info text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists event_type_template_items_type_idx
  on public.event_type_template_items (event_type_id, sort_order);

alter table public.event_type_template_items enable row level security;

drop policy if exists "event_type_template_items_select" on public.event_type_template_items;
create policy "event_type_template_items_select"
  on public.event_type_template_items for select
  to authenticated
  using (public.current_user_division() in ('magnarent', 'magnative', 'production', 'all'));

drop policy if exists "event_type_template_items_insert" on public.event_type_template_items;
create policy "event_type_template_items_insert"
  on public.event_type_template_items for insert
  to authenticated
  with check (public.current_user_division() = 'all');

drop policy if exists "event_type_template_items_update" on public.event_type_template_items;
create policy "event_type_template_items_update"
  on public.event_type_template_items for update
  to authenticated
  using (public.current_user_division() = 'all')
  with check (public.current_user_division() = 'all');

drop policy if exists "event_type_template_items_delete" on public.event_type_template_items;
create policy "event_type_template_items_delete"
  on public.event_type_template_items for delete
  to authenticated
  using (public.current_user_division() = 'all');

-- Event -- entitas baru berdiri sendiri, titik "Event In" di diagram Owner.
-- SENGAJA cuma akses penuh yang bisa submit/ubah event (mis. tutup/batalkan
-- event) -- staf operasional kerjanya di checklist (event_checklist_items),
-- bukan di data event itu sendiri.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_name text,
  event_type_id uuid references public.event_types (id) on delete set null,
  location text,
  start_date date,
  end_date date,
  status text not null default 'Berjalan'
    check (status in ('Berjalan', 'Selesai', 'Dibatalkan')),
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_status_idx on public.events (status);

drop trigger if exists set_updated_at on public.events;
create trigger set_updated_at before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;

drop policy if exists "events_select" on public.events;
create policy "events_select"
  on public.events for select
  to authenticated
  using (public.current_user_division() in ('magnarent', 'magnative', 'production', 'all'));

drop policy if exists "events_insert" on public.events;
create policy "events_insert"
  on public.events for insert
  to authenticated
  with check (public.current_user_division() = 'all');

drop policy if exists "events_update" on public.events;
create policy "events_update"
  on public.events for update
  to authenticated
  using (public.current_user_division() = 'all')
  with check (public.current_user_division() = 'all');

drop policy if exists "events_delete" on public.events;
create policy "events_delete"
  on public.events for delete
  to authenticated
  using (public.current_user_division() = 'all');

-- Kaitan opsional event ke data yang sudah ada di tiap divisi (pola
-- polimorfik sama seperti event_expenses.source_type/source_id, migrasi
-- 0049) -- inilah dasar akses baca lintas-divisi di bawah. SENGAJA dibuka
-- ke ketiga divisi operasional (bukan cuma akses penuh) supaya staf yang
-- menerima notifikasi event baru bisa langsung mengaitkan booking/proyek
-- MEREKA SENDIRI ke event itu, tidak harus lewat Admin dulu.
create table if not exists public.event_links (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  source_type text not null
    check (source_type in ('magnarent_booking', 'magnative_project', 'production_booth_project')),
  source_id uuid not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (event_id, source_type, source_id)
);

create index if not exists event_links_event_idx on public.event_links (event_id);
create index if not exists event_links_source_idx on public.event_links (source_type, source_id);

alter table public.event_links enable row level security;

drop policy if exists "event_links_select" on public.event_links;
create policy "event_links_select"
  on public.event_links for select
  to authenticated
  using (public.current_user_division() in ('magnarent', 'magnative', 'production', 'all'));

drop policy if exists "event_links_insert" on public.event_links;
create policy "event_links_insert"
  on public.event_links for insert
  to authenticated
  with check (public.current_user_division() in ('magnarent', 'magnative', 'production', 'all'));

drop policy if exists "event_links_delete" on public.event_links;
create policy "event_links_delete"
  on public.event_links for delete
  to authenticated
  using (public.current_user_division() in ('magnarent', 'magnative', 'production', 'all'));

-- Checklist AKTUAL satu event -- ini yang dikerjakan/diupdate sehari-hari.
-- SENGAJA dibuka penuh (select/insert/update/delete) ke ketiga divisi
-- operasional, bukan cuma akses penuh -- sesuai semangat "siapa saja yang
-- terlibat di event itu bisa mengerjakan & mengganti PIC tahap manapun".
create table if not exists public.event_checklist_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  category text not null,
  item_name text not null,
  detail text,
  qty_info text,
  notes text,
  status text not null default 'Belum Mulai'
    check (status in ('Belum Mulai', 'Sample', 'Approval', 'Preparation', 'Production', 'Finish')),
  pic uuid references auth.users (id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_checklist_items_event_idx
  on public.event_checklist_items (event_id, sort_order);

drop trigger if exists set_updated_at on public.event_checklist_items;
create trigger set_updated_at before update on public.event_checklist_items
  for each row execute function public.set_updated_at();

alter table public.event_checklist_items enable row level security;

drop policy if exists "event_checklist_items_select" on public.event_checklist_items;
create policy "event_checklist_items_select"
  on public.event_checklist_items for select
  to authenticated
  using (public.current_user_division() in ('magnarent', 'magnative', 'production', 'all'));

drop policy if exists "event_checklist_items_insert" on public.event_checklist_items;
create policy "event_checklist_items_insert"
  on public.event_checklist_items for insert
  to authenticated
  with check (public.current_user_division() in ('magnarent', 'magnative', 'production', 'all'));

drop policy if exists "event_checklist_items_update" on public.event_checklist_items;
create policy "event_checklist_items_update"
  on public.event_checklist_items for update
  to authenticated
  using (public.current_user_division() in ('magnarent', 'magnative', 'production', 'all'))
  with check (public.current_user_division() in ('magnarent', 'magnative', 'production', 'all'));

drop policy if exists "event_checklist_items_delete" on public.event_checklist_items;
create policy "event_checklist_items_delete"
  on public.event_checklist_items for delete
  to authenticated
  using (public.current_user_division() in ('magnarent', 'magnative', 'production', 'all'));

-- Akses baca LINTAS-DIVISI ke data booking/proyek/booth-proyek yang
-- dikaitkan (event_links) ke event manapun -- INTI dari permintaan "bisa
-- saling memantau/membantu, bukan cuma lihat status checklist". Dibungkus
-- fungsi supaya logikanya satu tempat, dipakai di ketiga tabel di bawah.
-- Bukan SECURITY DEFINER (tidak perlu lewati RLS event_links -- kebijakan
-- select event_links di atas sudah terbuka ke ketiga divisi operasional).
create or replace function public.current_user_can_view_linked_source(p_source_type text, p_source_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    public.current_user_division() in ('magnarent', 'magnative', 'production', 'all')
    and exists (
      select 1 from public.event_links el
      where el.source_type = p_source_type and el.source_id = p_source_id
    );
$$;

-- Tambahkan syarat baru ke kebijakan SELECT yang SUDAH ADA (migrasi
-- 0046-0048) di tiga tabel inti tiap divisi -- kondisi lama (akses divisi
-- sendiri + investor read-only) dipertahankan APA ADANYA, cuma ditambah
-- satu OR baru di akhir.
drop policy if exists "magnarent_bookings_select" on public.magnarent_bookings;
create policy "magnarent_bookings_select"
  on public.magnarent_bookings for select
  to authenticated
  using (
    public.can_access_division('magnarent')
    or public.current_user_is_investor()
    or public.current_user_can_view_linked_source('magnarent_booking', id)
  );

drop policy if exists "magnative_projects_select" on public.magnative_projects;
create policy "magnative_projects_select"
  on public.magnative_projects for select
  to authenticated
  using (
    public.can_access_division('magnative')
    or public.current_user_is_investor()
    or public.current_user_can_view_linked_source('magnative_project', id)
  );

drop policy if exists "production_booth_projects_select" on public.production_booth_projects;
create policy "production_booth_projects_select"
  on public.production_booth_projects for select
  to authenticated
  using (
    public.can_access_division('production')
    or public.current_user_is_investor()
    or public.current_user_can_view_linked_source('production_booth_project', id)
  );
