-- Pricing dinamis musiman (rekomendasi Bagian 5-C #16 laporan riset
-- kompetitor 24 Sep 2026 -- "Pricing dinamis berbasis musim/tanggal event
-- di atas tiered pricing durasi yang sudah ada"). SENGAJA disimpan sebagai
-- ATURAN TERPISAH (bukan mengubah pricePerDay langsung di magnarent_inventory)
-- supaya harga dasar tetap satu sumber kebenaran -- staf lihat rule ini
-- sebagai SARAN penyesuaian harga saat bikin booking di musim ramai,
-- bukan otomatis mengubah nilai invoice yang sudah dikonfirmasi (harga
-- final tetap keputusan staf, ditulis manual seperti sekarang).
create table if not exists magnarent_seasonal_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  -- null = berlaku untuk SEMUA alat, diisi = cuma alat itu (mis. harga
  -- kursi/tenda naik saat musim nikahan, tapi genset tidak).
  item_id uuid references magnarent_inventory(id) on delete cascade,
  label text not null,
  start_date date not null,
  end_date date not null,
  -- persen kenaikan/penurunan dari harga dasar, mis. 20 = +20%, -10 = -10%.
  multiplier_pct integer not null,
  created_at timestamptz not null default now(),
  constraint magnarent_seasonal_pricing_rules_dates check (end_date >= start_date)
);

create index if not exists magnarent_seasonal_pricing_rules_item_idx on magnarent_seasonal_pricing_rules(item_id);
create index if not exists magnarent_seasonal_pricing_rules_dates_idx on magnarent_seasonal_pricing_rules(start_date, end_date);

alter table magnarent_seasonal_pricing_rules enable row level security;

create policy magnarent_seasonal_pricing_rules_access on magnarent_seasonal_pricing_rules
  for all
  using (can_access_division('magnarent'))
  with check (can_access_division('magnarent'));
