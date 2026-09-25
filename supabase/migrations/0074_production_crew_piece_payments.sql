-- Piece-rate/upah borongan kru per unit-booth (analisis-kompetitor #21)
-- Terpisah dari production_crew_timelogs (jam kerja per-jam) -- ini
-- mencatat kesepakatan borongan per pekerjaan/unit, umum di model kerja
-- lepas industri fabrikasi booth Indonesia. Total dihitung di app layer
-- (jumlah_unit * rate_per_unit), sama pola dengan magnarent_subrent_records.

create table if not exists production_crew_piece_payments (
  id uuid primary key default gen_random_uuid(),
  project_crew_id uuid not null references production_project_crew(id) on delete cascade,
  deskripsi_pekerjaan text not null,
  jumlah_unit numeric not null default 1 check (jumlah_unit > 0),
  rate_per_unit numeric not null check (rate_per_unit >= 0),
  total_upah numeric not null check (total_upah >= 0),
  status text not null default 'Belum Dibayar'
    check (status in ('Belum Dibayar', 'Dibayar')),
  tanggal_bayar date,
  catatan text,
  created_at timestamptz not null default now()
);

create index if not exists production_crew_piece_payments_crew_idx
  on production_crew_piece_payments(project_crew_id);

alter table production_crew_piece_payments enable row level security;

create policy production_crew_piece_payments_access on production_crew_piece_payments
  for all using (can_access_division('production')) with check (can_access_division('production'));
