-- Tahap 28a: 4 fitur baru Magnarent yang dipilih Owner —
-- (1) checklist kondisi alat + foto saat keluar/kembali,
-- (2) pelacakan deposit/jaminan booking,
-- (3) log riwayat servis alat,
-- (4) pengingat H-1 sebelum pengembalian (lihat cron di
--     src/app/api/cron/booking-return-reminders/route.ts — tidak butuh
--     tabel baru, cuma query tanggalSelesai bookings yang sudah ada).
--
-- 3 fitur pertama SENGAJA jadi tabel terpisah dari magnarent_bookings/
-- magnarent_inventory (bukan kolom tambahan) supaya TIDAK perlu mengubah
-- RPC `save_booking_checked` (migrasi 0020) yang sudah teruji menangani
-- race condition booking — deposit & checklist itu informasi TAMBAHAN yang
-- munculnya belakangan (opsional, boleh kosong), bukan bagian dari
-- keputusan "berapa unit yang tersedia" yang jadi urusan RPC itu.

-- (1) Checklist kondisi alat ------------------------------------------------
create table if not exists public.magnarent_booking_checks (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.magnarent_bookings (id) on delete cascade,
  stage text not null check (stage in ('keluar', 'kembali')),
  catatan text,
  photo_urls text[] not null default '{}',
  photo_storage_paths text[] not null default '{}',
  checked_by uuid references public.profiles (id) on delete set null,
  checked_at timestamptz not null default now(),
  unique (booking_id, stage)
);

alter table public.magnarent_booking_checks enable row level security;

drop policy if exists "magnarent_booking_checks_access" on public.magnarent_booking_checks;
create policy "magnarent_booking_checks_access"
  on public.magnarent_booking_checks for all
  to authenticated
  using (public.can_access_division('magnarent'))
  with check (public.can_access_division('magnarent'));

insert into storage.buckets (id, name, public)
values ('magnarent-checks', 'magnarent-checks', true)
on conflict (id) do nothing;

drop policy if exists "magnarent_checks_read" on storage.objects;
create policy "magnarent_checks_read"
  on storage.objects for select
  to public
  using (bucket_id = 'magnarent-checks');

drop policy if exists "magnarent_checks_insert" on storage.objects;
create policy "magnarent_checks_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'magnarent-checks' and public.can_access_division('magnarent'));

drop policy if exists "magnarent_checks_update" on storage.objects;
create policy "magnarent_checks_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'magnarent-checks' and public.can_access_division('magnarent'))
  with check (bucket_id = 'magnarent-checks' and public.can_access_division('magnarent'));

drop policy if exists "magnarent_checks_delete" on storage.objects;
create policy "magnarent_checks_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'magnarent-checks' and public.can_access_division('magnarent'));

-- (2) Deposit / jaminan booking ---------------------------------------------
create table if not exists public.magnarent_booking_deposits (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.magnarent_bookings (id) on delete cascade,
  jenis text not null check (jenis in ('Uang Tunai', 'KTP', 'SIM', 'Lainnya')),
  jumlah integer not null default 0 check (jumlah >= 0),
  keterangan text,
  dikembalikan boolean not null default false,
  dikembalikan_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.magnarent_booking_deposits;
create trigger set_updated_at before update on public.magnarent_booking_deposits
  for each row execute function public.set_updated_at();

alter table public.magnarent_booking_deposits enable row level security;

drop policy if exists "magnarent_booking_deposits_access" on public.magnarent_booking_deposits;
create policy "magnarent_booking_deposits_access"
  on public.magnarent_booking_deposits for all
  to authenticated
  using (public.can_access_division('magnarent'))
  with check (public.can_access_division('magnarent'));

-- (3) Log riwayat servis/perbaikan alat --------------------------------------
create table if not exists public.magnarent_maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.magnarent_inventory (id) on delete cascade,
  tanggal date not null default current_date,
  jenis text not null check (jenis in ('Servis Rutin', 'Perbaikan', 'Lainnya')),
  keterangan text,
  biaya integer not null default 0 check (biaya >= 0),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.magnarent_maintenance_logs enable row level security;

drop policy if exists "magnarent_maintenance_logs_access" on public.magnarent_maintenance_logs;
create policy "magnarent_maintenance_logs_access"
  on public.magnarent_maintenance_logs for all
  to authenticated
  using (public.can_access_division('magnarent'))
  with check (public.can_access_division('magnarent'));
