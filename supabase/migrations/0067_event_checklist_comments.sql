-- Thread diskusi per item checklist (rekomendasi Bagian 5-B #7 laporan
-- riset kompetitor 24 Sep 2026 -- "Live document sync + thread diskusi
-- terikat langsung ke item checklist", ala Curate/Tripleseat). Memperkuat
-- histori status/PIC (event_checklist_status_log) yang sudah ada dengan
-- lapisan komunikasi -- staf lintas divisi bisa diskusi langsung di item
-- checklist yang relevan, bukan lewat WhatsApp terpisah. Pola meniru persis
-- `magnative_asset_comments` (proofing ringan aset kreatif, migrasi 0060).
create table if not exists event_checklist_comments (
  id uuid primary key default gen_random_uuid(),
  checklist_item_id uuid not null references event_checklist_items(id) on delete cascade,
  author_name text not null,
  comment_text text not null,
  is_resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists event_checklist_comments_item_idx on event_checklist_comments(checklist_item_id);

alter table event_checklist_comments enable row level security;

-- Akses sama seperti event_checklist_items -- 3 divisi operasional + akses
-- penuh, karena diskusi ini terikat ke checklist lintas-divisi.
create policy event_checklist_comments_access on event_checklist_comments
  for all
  using (current_user_division() = any (array['magnarent', 'magnative', 'production', 'all']))
  with check (current_user_division() = any (array['magnarent', 'magnative', 'production', 'all']));
