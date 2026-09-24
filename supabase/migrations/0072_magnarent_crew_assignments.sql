-- Crew/labor scheduling terintegrasi booking alat (Gap laporan Bagian
-- 5-C) -- satu baris per orang yang ditugaskan ke satu booking (sopir,
-- rigger, teknisi, dll), TANPA jadwal jam kerja terpisah -- rentang
-- tanggalnya ikut tanggal booking (magnarent_bookings.tanggal_mulai/
-- tanggal_selesai). Deteksi bentrok jadwal antar-booking dihitung di
-- aplikasi (heuristik overlap tanggal, bukan constraint DB), lihat
-- extras-actions.ts.
create table if not exists public.magnarent_crew_assignments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.magnarent_bookings(id) on delete cascade,
  crew_name text not null,
  role text not null,
  catatan text,
  created_at timestamptz not null default now()
);

create index if not exists magnarent_crew_assignments_booking_id_idx
  on public.magnarent_crew_assignments (booking_id);

create index if not exists magnarent_crew_assignments_crew_name_idx
  on public.magnarent_crew_assignments (crew_name);

alter table public.magnarent_crew_assignments enable row level security;

create policy magnarent_crew_assignments_access on public.magnarent_crew_assignments
  for all using (can_access_division('magnarent'));
