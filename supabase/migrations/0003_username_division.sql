-- Revisi model login: dari "email + daftar sendiri" menjadi
-- "username + akun dibuatkan admin". Email asli tetap tersimpan di kolom
-- `email` (sudah ada sejak 0001) semata-mata sebagai alamat PEMULIHAN
-- password lewat email reset bawaan Supabase — bukan untuk login, dan bukan
-- lewat Google OAuth (fitur itu sengaja tidak dipakai lagi).

alter table public.profiles
  add column if not exists username text unique,
  add column if not exists division text not null default 'production';

alter table public.profiles
  drop constraint if exists profiles_division_check;
alter table public.profiles
  add constraint profiles_division_check
  check (division in ('magnarent', 'magnative', 'production', 'all'));

-- Trigger diperbarui: username & division WAJIB datang dari app_metadata —
-- kolom ini hanya bisa diisi lewat Supabase Admin API (service role key di
-- server), TIDAK BISA diubah sendiri oleh pengguna dari browser (beda
-- dengan user_metadata biasa yang bisa diubah pengguna lewat updateUser()).
-- Ini yang membuat pembagian akses per-divisi aman dari "self-upgrade".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, username, division)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_app_meta_data ->> 'username',
    coalesce(new.raw_app_meta_data ->> 'division', 'production')
  );
  return new;
end;
$$;

-- Helper SECURITY DEFINER untuk cek "apakah pengguna yang sedang login
-- punya akses penuh" TANPA memicu RLS berulang pada tabel yang sama
-- (query mentah dalam policy ke tabel yang sama persis bisa bikin error
-- "infinite recursion detected in policy" di Postgres).
create or replace function public.current_user_has_full_access()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and division = 'all'
  );
$$;

grant execute on function public.current_user_has_full_access() to authenticated;

-- Perketat siapa boleh lihat baris siapa: dulu SEMUA pengguna login bisa
-- lihat SEMUA profil. Sekarang setiap orang cuma lihat profilnya sendiri
-- (dipakai Topbar), KECUALI yang division-nya 'all' (Owner/Finance/
-- Investor) yang boleh lihat semua staf (dipakai halaman "Kelola Pengguna").
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profil sendiri atau semua profil untuk akses penuh"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.current_user_has_full_access());
