-- Subcontracting tracking terintegrasi BOM (analisis-kompetitor #24) --
-- material yang dikirim ke vendor eksternal (laser cutting, printing
-- besar, dsb) lalu diterima kembali sebagai barang jadi. `material_dikirim`
-- SENGAJA berbentuk jsonb [{materialId, qty}] -- bentuk persis sama dengan
-- kolom `materials` di production_booth_projects (migrasi 0006) -- supaya
-- "terintegrasi BOM": staf memilih item dari BOM proyek yang sama yang
-- sedang dikirim keluar, bukan input bebas. Tabel ini TIDAK mengubah stok
-- gudang (availability.ts) -- material yang dikirim tetap bagian dari BOM
-- proyek yang sudah dialokasikan, ini murni tracking status & vendor.

create table if not exists production_subcontract_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references production_booth_projects (id) on delete cascade,
  vendor_id uuid references production_vendors (id) on delete set null,
  deskripsi_pekerjaan text not null,
  -- Bentuk: [{"materialId": "<uuid production_materials.id>", "qty": <number>}, ...]
  material_dikirim jsonb not null default '[]'::jsonb,
  status text not null default 'Dikirim'
    check (status in ('Dikirim', 'Diproses', 'Diterima', 'Dibatalkan')),
  tanggal_kirim date not null default current_date,
  estimasi_terima date,
  tanggal_terima date,
  biaya_jasa numeric not null default 0 check (biaya_jasa >= 0),
  catatan text,
  created_at timestamptz not null default now()
);

create index if not exists production_subcontract_orders_project_idx on production_subcontract_orders(project_id);
create index if not exists production_subcontract_orders_vendor_idx on production_subcontract_orders(vendor_id);

alter table production_subcontract_orders enable row level security;

create policy production_subcontract_orders_access on production_subcontract_orders
  for all using (can_access_division('production')) with check (can_access_division('production'));
