-- Modul NC/CAPA (non-conformance & tindakan korektif/preventif --
-- analisis-kompetitor #23). SENGAJA tabel terpisah dari
-- production_project_checks (migrasi 0027, checklist rutin instalasi/
-- bongkar): NC/CAPA ini mencatat TEMUAN ketidaksesuaian kualitas (material
-- cacat, vendor telat kirim, kru lalai pasang, dsb) dan tindak lanjutnya,
-- ditautkan OPSIONAL ke proyek/vendor/kru supaya bisa ditelusuri sebagai
-- riwayat kualitas per vendor/kru dari waktu ke waktu (bukan cuma per
-- proyek). Murni pencatatan manual oleh staf -- TIDAK ADA skoring/analisis
-- otomatis berbasis AI di modul ini.

create table if not exists production_nc_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references production_booth_projects (id) on delete set null,
  vendor_id uuid references production_vendors (id) on delete set null,
  project_crew_id uuid references production_project_crew (id) on delete set null,
  kategori text not null default 'Proses'
    check (kategori in ('Material', 'Vendor', 'Kru', 'Proses', 'Lainnya')),
  judul text not null,
  deskripsi text not null,
  severity text not null default 'Sedang'
    check (severity in ('Rendah', 'Sedang', 'Tinggi')),
  status text not null default 'Open'
    check (status in ('Open', 'Investigasi', 'Tindakan Korektif', 'Ditutup')),
  akar_masalah text,
  tindakan_korektif text,
  tindakan_preventif text,
  pic text,
  tanggal_ditemukan date not null default current_date,
  tanggal_ditutup date,
  created_at timestamptz not null default now()
);

create index if not exists production_nc_reports_project_idx on production_nc_reports(project_id);
create index if not exists production_nc_reports_vendor_idx on production_nc_reports(vendor_id);
create index if not exists production_nc_reports_crew_idx on production_nc_reports(project_crew_id);

alter table production_nc_reports enable row level security;

create policy production_nc_reports_access on production_nc_reports
  for all using (can_access_division('production')) with check (can_access_division('production'));
