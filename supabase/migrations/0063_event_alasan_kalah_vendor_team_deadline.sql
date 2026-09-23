-- Rekomendasi 1, 3, 4, 5 dari laporan "Claude outputs/analisis-alur-event-
-- vs-sop-owner.md" (23 Sep 2026) -- Owner setuju kerjakan semua sekaligus.
--
-- 1) magnative_projects.alasan_kalah -- field "kenapa kalah" yang diminta
--    Owner (baris LOSE di papan tulis SOP). Nullable di DB (proyek lama
--    yang sudah "Dibatalkan" belum pernah mengisi ini) -- wajib diisi
--    DITEGAKKAN di server action (validateMagnativeProjectInput di
--    src/lib/magnative/actions.ts) saat status diubah ke "Dibatalkan",
--    bukan lewat CHECK constraint DB, konsisten dengan pola validasi lain
--    di file itu (mis. validasi tanggal/budget).
--
-- 3) event_checklist_items.vendor_id -- hubungkan checklist Event ke basis
--    data Vendor Magnativ yang sudah ada (magnative_vendors, migrasi
--    0026), supaya sourcing (harga/kategori vendor mis. "Percetakan" --
--    contoh persis di papan tulis Owner) langsung terlihat dari checklist,
--    tidak perlu buka dua tempat terpisah. `on delete set null` (BUKAN
--    cascade) -- vendor yang dihapus dari basis data tidak boleh ikut
--    menghapus baris checklist yang memakainya, cukup kaitannya lepas.
--
-- 4) event_checklist_items.team -- pembagian kerja terstruktur (papan
--    tulis: Team Creative -> 2D/3D/Motion Design, vs Team Project -> input
--    ke proposal deck), terpisah dari `category` yang bebas teks supaya
--    tim bisa difilter. Sengaja TEXT bebas (bukan enum Postgres) -- UI
--    menawarkan preset "Tim Creative"/"Tim Project" tapi staf tetap bisa
--    isi nama tim lain kalau perlu, sama semangatnya dengan `category`.
--
-- 5) event_checklist_items.due_date -- tanggal target per BARIS checklist
--    (bukan cuma tanggal mulai/selesai event secara keseluruhan), supaya
--    "Timeline Project" di papan tulis bisa dilihat granular per item.
alter table public.magnative_projects
  add column if not exists alasan_kalah text;

alter table public.event_checklist_items
  add column if not exists vendor_id uuid references public.magnative_vendors(id) on delete set null,
  add column if not exists team text,
  add column if not exists due_date date;

comment on column public.magnative_projects.alasan_kalah is
  'Alasan proyek batal/kalah pitching -- wajib diisi di server action saat status diubah ke Dibatalkan (lihat migrasi 0063).';
comment on column public.event_checklist_items.vendor_id is
  'Kaitan opsional ke magnative_vendors -- sourcing (harga/kategori) langsung terlihat dari checklist (migrasi 0063).';
comment on column public.event_checklist_items.team is
  'Nama tim penanggung jawab item (mis. "Tim Creative"/"Tim Project"), bebas teks -- lihat migrasi 0063.';
comment on column public.event_checklist_items.due_date is
  'Tanggal target/deadline item checklist ini, terpisah dari tanggal mulai/selesai event (migrasi 0063).';
