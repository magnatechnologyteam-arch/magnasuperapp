-- Lanjutan Tahap 4 dari roadmap peningkatan MagnaSuperApp (feedback investor
-- yang diteruskan owner soal modul Magnativ): "ada link yg bisa kasih kita
-- rekapan cost dan kapannya (keluar atau masuk dana)". Dana MASUK sudah
-- tercatat lewat tabel `invoices` yang bisa dihubungkan ke proyek Magnativ
-- (sourceType 'magnative_project', lihat src/app/dashboard/admin/faktur);
-- tabel ini melengkapi sisi dana KELUAR (biaya pitching, produksi, vendor,
-- dll) per proyek, dicatat per baris (bukan satu angka total) supaya
-- rekapannya rinci per pengeluaran dan tanggal.
--
-- Biaya boleh dicatat di proyek tahap apa pun, termasuk "Pitching" (migrasi
-- 0016) yang belum tentu deal — kalau pitching gagal, biayanya tetap
-- tercatat sebagai pengeluaran nyata.
create table if not exists public.magnative_project_costs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.magnative_projects (id) on delete cascade,
  description text not null,
  amount integer not null check (amount >= 0),
  cost_date date not null default current_date,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists magnative_project_costs_project_id_idx
  on public.magnative_project_costs (project_id);

alter table public.magnative_project_costs enable row level security;

drop policy if exists "magnative_project_costs_access" on public.magnative_project_costs;
create policy "magnative_project_costs_access"
  on public.magnative_project_costs for all
  to authenticated
  using (public.can_access_division('magnative'))
  with check (public.can_access_division('magnative'));
