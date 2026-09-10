-- Tahap 29: banner "Sistem sedang diperbarui" — saklar manual yang
-- dinyalakan admin sebelum melakukan perbaikan/deploy besar, supaya semua
-- pengguna (semua divisi + investor) tahu kalau tampilan mungkin sedikit
-- aneh sesaat, bukan mengira aplikasinya rusak.
--
-- Tabel "singleton" (selalu cuma 1 baris, id dikunci = 1 lewat check
-- constraint) — pola lebih sederhana daripada key-value settings table
-- karena baru ada satu pengaturan seperti ini sejauh ini.

create table if not exists public.system_status (
  id smallint primary key default 1 check (id = 1),
  maintenance_active boolean not null default false,
  maintenance_message text not null default 'Sistem sedang diperbarui, mohon tunggu sebentar — beberapa tampilan mungkin sedikit berubah.',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

insert into public.system_status (id) values (1)
  on conflict (id) do nothing;

drop trigger if exists set_updated_at on public.system_status;
create trigger set_updated_at before update on public.system_status
  for each row execute function public.set_updated_at();

alter table public.system_status enable row level security;

-- Semua pengguna yang login (divisi apa pun, termasuk investor) perlu
-- bisa BACA baris ini supaya banner-nya kelihatan di mana-mana.
drop policy if exists "system_status_read" on public.system_status;
create policy "system_status_read"
  on public.system_status for select
  to authenticated
  using (true);

-- Cuma akses penuh (Owner/Finance/Admin) yang boleh menyalakan/mematikan.
drop policy if exists "system_status_write" on public.system_status;
create policy "system_status_write"
  on public.system_status for update
  to authenticated
  using (public.current_user_has_full_access())
  with check (public.current_user_has_full_access());
