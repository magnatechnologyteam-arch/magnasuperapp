-- Log aktivitas lintas modul — dipakai halaman "Aktivitas" (khusus akses
-- penuh) supaya Owner/Finance bisa lihat siapa mengubah apa dan kapan,
-- tanpa perlu buka Supabase langsung. Baris ini sengaja TIDAK BISA diubah
-- atau dihapus lewat API (tidak ada policy update/delete) — begitu tercatat,
-- tetap tercatat, seperti audit trail pada umumnya.
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  actor_name text not null,
  division text not null,
  module text not null check (module in ('magnarent', 'magnative', 'production', 'admin')),
  action text not null check (action in ('create', 'update', 'delete', 'status_change')),
  entity_type text not null,
  entity_label text,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_created_at_idx on public.activity_log (created_at desc);

alter table public.activity_log enable row level security;

-- Cuma akses penuh yang boleh MEMBACA log (dipakai halaman Aktivitas).
-- `current_user_division()` didefinisikan di migrasi 0004, dipakai ulang
-- di sini seperti modul-modul lain.
drop policy if exists "activity_log_select_full_access" on public.activity_log;
create policy "activity_log_select_full_access"
  on public.activity_log for select
  to authenticated
  using (public.current_user_division() = 'all');

-- Siapa pun yang login boleh MENULIS baris log — supaya aksi staf divisi
-- manapun (booking baru, ubah stok, dst.) bisa tercatat, bukan cuma yang
-- akses penuh. Tidak ada policy update/delete sama sekali (termasuk untuk
-- 'all') — jadi log ini immutable lewat API biasa.
drop policy if exists "activity_log_insert_any_authenticated" on public.activity_log;
create policy "activity_log_insert_any_authenticated"
  on public.activity_log for insert
  to authenticated
  with check (auth.uid() is not null);
