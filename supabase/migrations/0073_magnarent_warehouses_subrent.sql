-- Multi-lokasi gudang & subrent tracking (analisis-kompetitor #15, Gap #9)
-- Bagian A: gudang bernama + lokasi per-unit + log transfer antar gudang.
-- Bagian B: pencatatan alat subrent (dipinjam dari vendor luar buat
-- menutupi kekurangan stok in-house saat fulfillment booking).

create table if not exists magnarent_warehouses (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  alamat text,
  catatan text,
  created_at timestamptz not null default now()
);

alter table magnarent_inventory_units
  add column if not exists warehouse_id uuid references magnarent_warehouses(id) on delete set null;

create index if not exists magnarent_inventory_units_warehouse_id_idx
  on magnarent_inventory_units(warehouse_id);

create table if not exists magnarent_warehouse_transfers (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references magnarent_inventory_units(id) on delete cascade,
  from_warehouse_id uuid references magnarent_warehouses(id) on delete set null,
  to_warehouse_id uuid not null references magnarent_warehouses(id) on delete cascade,
  catatan text,
  transferred_at timestamptz not null default now()
);

create index if not exists magnarent_warehouse_transfers_unit_id_idx
  on magnarent_warehouse_transfers(unit_id);

create table if not exists magnarent_subrent_records (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references magnarent_bookings(id) on delete set null,
  item_id uuid references magnarent_inventory(id) on delete set null,
  vendor_name text not null,
  jumlah_unit integer not null default 1,
  harga_sewa_total numeric,
  tanggal_mulai date not null,
  tanggal_selesai date not null,
  status text not null default 'Dipesan'
    check (status in ('Dipesan', 'Diterima', 'Dikembalikan', 'Dibatalkan')),
  catatan text,
  created_at timestamptz not null default now()
);

create index if not exists magnarent_subrent_records_booking_id_idx
  on magnarent_subrent_records(booking_id);
create index if not exists magnarent_subrent_records_item_id_idx
  on magnarent_subrent_records(item_id);

alter table magnarent_warehouses enable row level security;
alter table magnarent_warehouse_transfers enable row level security;
alter table magnarent_subrent_records enable row level security;

create policy magnarent_warehouses_access on magnarent_warehouses
  for all using (can_access_division('magnarent')) with check (can_access_division('magnarent'));

create policy magnarent_warehouse_transfers_access on magnarent_warehouse_transfers
  for all using (can_access_division('magnarent')) with check (can_access_division('magnarent'));

create policy magnarent_subrent_records_access on magnarent_subrent_records
  for all using (can_access_division('magnarent')) with check (can_access_division('magnarent'));
