-- Live location dispatch berbasis browser geolocation (Gap laporan Bagian
-- 5-C) -- pelengkap ringan buat penjadwalan pengiriman/pengambilan yang
-- sudah ada (magnarent_deliveries, migrasi 0061), BUKAN app terpisah buat
-- sopir. Token publik per baris delivery (pola sama seperti magic-link
-- portal/check-in) dibuka sopir dari HP-nya, browser kirim lat/lng via
-- Geolocation API ke sini tanpa perlu login.
alter table public.magnarent_deliveries
  add column if not exists tracking_token text,
  add column if not exists last_lat double precision,
  add column if not exists last_lng double precision,
  add column if not exists last_location_at timestamptz;

create unique index if not exists magnarent_deliveries_tracking_token_key
  on public.magnarent_deliveries (tracking_token)
  where tracking_token is not null;
