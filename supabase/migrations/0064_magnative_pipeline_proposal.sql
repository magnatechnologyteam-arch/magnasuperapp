-- Rekomendasi 2 dari laporan "Claude outputs/analisis-alur-event-vs-sop-
-- owner.md" (23 Sep 2026): modul "Pipeline Proposal" -- mendigitalkan
-- tahap SEBELUM keputusan menang/kalah (papan tulis Owner: Invitation ->
-- Briefing -> Submit -> Present) yang sebelumnya SAMA SEKALI tidak
-- tercatat di sistem manapun (lihat Bagian 2 & 3 laporan). Cuma relevan
-- selagi status proyek "Pitching" -- begitu proyek pindah ke Perencanaan
-- (WIN) atau Dibatalkan (LOSE, lihat migrasi 0063 utk alasan_kalah),
-- histori pipeline & file-nya TETAP ADA sebagai riwayat, tidak dihapus.
--
-- Bentuk MOM/rekaman/draft proposal: UPLOAD FILE BEBAS FORMAT + catatan
-- singkat per tahap (disetujui Owner -- bukan field terstruktur terpisah
-- per jenis dokumen), supaya staf bisa unggah PDF/Word/PPT/audio rekaman
-- dll di satu tempat yang sama, fleksibel untuk semua jenis dokumen.
alter table public.magnative_projects
  add column if not exists pipeline_stage text
    check (pipeline_stage is null or pipeline_stage in ('Invitation', 'Briefing', 'Submit', 'Present'));

comment on column public.magnative_projects.pipeline_stage is
  'Tahap pipeline proposal SEBELUM menang/kalah (Invitation/Briefing/Submit/Present), null = belum mulai. Lihat migrasi 0064.';

create table public.magnative_pipeline_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.magnative_projects(id) on delete cascade,
  stage text not null check (stage in ('Invitation', 'Briefing', 'Submit', 'Present')),
  file_name text not null,
  file_url text not null,
  storage_path text not null,
  notes text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.magnative_pipeline_files is
  'File pendukung tiap tahap pipeline proposal (MOM, rekaman, draft proposal/budget) -- upload bebas format, migrasi 0064.';

create index magnative_pipeline_files_project_id_idx on public.magnative_pipeline_files (project_id);

alter table public.magnative_pipeline_files enable row level security;

-- RLS: pola sama persis dengan magnative_vendors/magnative_creative_assets
-- (migrasi 0026) -- satu policy ALL untuk divisi magnative + akses penuh
-- (can_access_division('magnative') sudah otomatis true untuk division
-- 'all', lihat definisi fungsinya). Modul Magnative konsisten pakai satu
-- policy ALL per tabel, bukan 4 policy terpisah seperti Production.
create policy "magnative_pipeline_files_access" on public.magnative_pipeline_files
  for all
  to authenticated
  using (public.can_access_division('magnative'))
  with check (public.can_access_division('magnative'));

-- Bucket public -- pola sama persis dengan magnative-assets/magnative-
-- portfolio (migrasi 0026/0012): baca bebas lewat public URL (biar bisa
-- langsung dibuka/didownload dari link tanpa signed URL), tulis dibatasi
-- staf Magnativ/akses penuh. Ini KONSISTEN dengan SEMUA bucket lain di
-- aplikasi ini (termasuk dokumen sensitif seperti invoice-pdfs,
-- capital-request-proofs) -- bukan pengecualian baru, path filenya tetap
-- UUID acak (tidak bisa ditebak) sama seperti bucket lain.
insert into storage.buckets (id, name, public)
values ('magnative-pipeline-files', 'magnative-pipeline-files', true)
on conflict (id) do nothing;

drop policy if exists "magnative_pipeline_files_read" on storage.objects;
create policy "magnative_pipeline_files_read"
on storage.objects for select
using (bucket_id = 'magnative-pipeline-files');

drop policy if exists "magnative_pipeline_files_insert" on storage.objects;
create policy "magnative_pipeline_files_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'magnative-pipeline-files' and public.can_access_division('magnative'));

drop policy if exists "magnative_pipeline_files_delete" on storage.objects;
create policy "magnative_pipeline_files_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'magnative-pipeline-files' and public.can_access_division('magnative'));
