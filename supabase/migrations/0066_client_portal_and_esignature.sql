-- Migrasi 0066: Portal klien (magic link) + e-signature in-house
-- Riset kompetitor 24 Sep 2026 (Bagian 5-A item Tinggi #1 & #2) --
-- portal self-service klien lintas 3 modul + tanda tangan digital
-- in-house (canvas + audit trail), tanpa provider berbayar (arahan Owner).

create table if not exists client_portal_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  module text not null check (module in ('magnative','magnarent','production')),
  entity_id uuid not null,
  client_name text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  last_accessed_at timestamptz,
  revoked boolean not null default false
);

create index if not exists idx_client_portal_links_entity on client_portal_links(module, entity_id);
create index if not exists idx_client_portal_links_token on client_portal_links(token);

create table if not exists document_signatures (
  id uuid primary key default gen_random_uuid(),
  module text not null check (module in ('magnative','magnarent','production')),
  entity_id uuid not null,
  document_label text not null,
  signer_name text not null,
  signer_role text,
  signature_data_url text not null,
  signed_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  portal_link_id uuid references client_portal_links(id),
  created_by uuid references auth.users(id)
);

create index if not exists idx_document_signatures_entity on document_signatures(module, entity_id);

alter table client_portal_links enable row level security;
alter table document_signatures enable row level security;

create policy "staff_full_access_portal_links" on client_portal_links
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "staff_full_access_signatures" on document_signatures
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
