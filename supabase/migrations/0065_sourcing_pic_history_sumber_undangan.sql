-- Tindak lanjut perbandingan papan tulis Owner (Tracking Progress Event +
-- SOP Pitching) vs modul yang sudah ada -- Owner konfirmasi kerjakan
-- ketiganya sekaligus:
--
-- 1) magnative_project_tasks.vendor_id + biaya_estimasi -- papan tulis SOP
--    (cabang WIN) nunjukin task proyek pasca-menang butuh sourcing +
--    estimasi harga per item (contoh: "Tollebag + DTF 30x30cm, Harga:
--    40.000"), bukan cuma judul/deadline/PIC seperti sekarang. Pola sama
--    persis dengan `event_checklist_items.vendor_id` (migrasi 0063):
--    `on delete set null` (BUKAN cascade) supaya vendor yang dihapus dari
--    basis data tidak ikut menghapus task yang memakainya.
--
-- 2) event_checklist_status_log -- papan tulis "Tracking Progress Event"
--    nulis PIC terpisah per tahap (Preparation PIC, Production PIC, Finish
--    PIC), sedangkan `event_checklist_items.pic` sekarang cuma satu nilai
--    yang DITIMPA tiap kali status berubah -- tidak ada riwayat siapa yang
--    pegang di tahap apa. Tabel baru ini APPEND-ONLY (tidak ada update/
--    delete lewat aplikasi): tiap kali `updateEventChecklistProgress`
--    dipanggil, satu baris baru ditulis di sini SEBELUM update ke
--    `event_checklist_items` sendiri -- jadi riwayat lengkap tanpa ubah
--    struktur tabel checklist yang sudah ada.
--
-- 3) magnative_projects.sumber_undangan -- papan tulis SOP bedain
--    undangan pitching "dari Client" langsung vs "dari Brand" (lewat
--    Jaron/Admin) di tahap paling awal. Sengaja TEXT bebas (bukan enum
--    Postgres/CHECK constraint) -- UI menawarkan preset "Client"/"Brand"
--    tapi staf tetap bisa isi sumber lain, sama semangatnya dengan
--    `event_checklist_items.team` (migrasi 0063).
alter table public.magnative_project_tasks
  add column if not exists vendor_id uuid references public.magnative_vendors(id) on delete set null,
  add column if not exists biaya_estimasi numeric;

comment on column public.magnative_project_tasks.vendor_id is
  'Kaitan opsional ke magnative_vendors -- sourcing per task proyek (migrasi 0065).';
comment on column public.magnative_project_tasks.biaya_estimasi is
  'Estimasi harga/biaya task ini (Rupiah), MURNI informatif seperti Project.biayaEstimasi -- bukan sumber jurnal akuntansi (migrasi 0065).';

alter table public.magnative_projects
  add column if not exists sumber_undangan text;

comment on column public.magnative_projects.sumber_undangan is
  'Sumber/channel undangan pitching masuk (mis. "Client"/"Brand"), bebas teks -- migrasi 0065.';

create table if not exists public.event_checklist_status_log (
  id uuid primary key default gen_random_uuid(),
  checklist_item_id uuid not null references public.event_checklist_items (id) on delete cascade,
  status text not null
    check (status in ('Belum Mulai', 'Sample', 'Approval', 'Preparation', 'Production', 'Finish')),
  pic uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists event_checklist_status_log_item_idx
  on public.event_checklist_status_log (checklist_item_id, changed_at desc);

alter table public.event_checklist_status_log enable row level security;
-- Baca+tulis: sama persis dengan RLS event_checklist_items (3 divisi
-- operasional + akses penuh, migrasi 0053) -- SENGAJA tidak ada policy
-- update/delete, log ini append-only lewat aplikasi.
drop policy if exists "event_checklist_status_log_select" on public.event_checklist_status_log;
create policy "event_checklist_status_log_select"
  on public.event_checklist_status_log for select
  to authenticated
  using (public.current_user_division() in ('magnarent', 'magnative', 'production', 'all'));

drop policy if exists "event_checklist_status_log_insert" on public.event_checklist_status_log;
create policy "event_checklist_status_log_insert"
  on public.event_checklist_status_log for insert
  to authenticated
  with check (public.current_user_division() in ('magnarent', 'magnative', 'production', 'all'));

comment on table public.event_checklist_status_log is
  'Riwayat perubahan status & PIC per item checklist Event (Papan Tracking, Tahap D) -- append-only, migrasi 0065.';
