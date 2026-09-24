-- Check-in QR & analitik on-site sederhana (rekomendasi Bagian 5-B #10
-- laporan riset kompetitor 24 Sep 2026 -- "Heatmap/analitik keterlibatan
-- on-site (check-in QR, dwell-time) sebagai laporan pasca-event bernilai
-- jual ke klien brand"). Skala disederhanakan jadi hitung kehadiran +
-- linimasa check-in (bukan heatmap lokasi/dwell-time penuh yang perlu
-- perangkat tambahan seperti BLE/RFID) -- tetap berguna sebagai bukti
-- keterlibatan on-site untuk laporan pasca-event ke klien "Brand pitching".
create table if not exists magnative_checkin_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references magnative_projects(id) on delete cascade,
  token text not null unique,
  label text,
  created_at timestamptz not null default now()
);

create table if not exists magnative_checkins (
  id uuid primary key default gen_random_uuid(),
  checkin_link_id uuid not null references magnative_checkin_links(id) on delete cascade,
  guest_name text,
  checked_in_at timestamptz not null default now()
);

create index if not exists magnative_checkin_links_project_idx on magnative_checkin_links(project_id);
create index if not exists magnative_checkins_link_idx on magnative_checkins(checkin_link_id);

alter table magnative_checkin_links enable row level security;
alter table magnative_checkins enable row level security;

-- Staf Magnative kelola link & lihat rekap; submit check-in publik lewat
-- server action dengan service-role (createAdminClient), bukan lewat RLS
-- di sini -- pola sama seperti client_portal_links/document_signatures.
create policy magnative_checkin_links_access on magnative_checkin_links
  for all
  using (can_access_division('magnative'))
  with check (can_access_division('magnative'));

create policy magnative_checkins_access on magnative_checkins
  for all
  using (can_access_division('magnative'))
  with check (can_access_division('magnative'));
