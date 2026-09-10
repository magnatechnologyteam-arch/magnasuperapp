-- Tahap 27: fitur Pengaturan akun — ganti tema, ganti bahasa, unggah/ubah
-- foto profil, dan ubah nama sendiri. Semua kolom baru di sini SENGAJA
-- terpisah dari division/role/username (kolom hak akses) — lihat trigger
-- di bawah untuk alasannya.

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists avatar_storage_path text,
  add column if not exists theme_preference text not null default 'system',
  add column if not exists language_preference text not null default 'id';

alter table public.profiles
  drop constraint if exists profiles_theme_preference_check;
alter table public.profiles
  add constraint profiles_theme_preference_check
  check (theme_preference in ('light', 'dark', 'system'));

alter table public.profiles
  drop constraint if exists profiles_language_preference_check;
alter table public.profiles
  add constraint profiles_language_preference_check
  check (language_preference in ('id', 'en'));

-- CELAH KEAMANAN LAMA yang ditutup sekalian di sini: sejak migrasi 0001,
-- policy "Users can update their own profile" cuma mengecek BARIS mana
-- yang boleh diubah (auth.uid() = id), bukan KOLOM apa saja yang boleh
-- diubah. Migrasi 0003 menjelaskan division/username wajib datang dari
-- app_metadata SAAT AKUN DIBUAT — tapi tidak ada yang mencegah staf
-- mengubahnya SENDIRI belakangan lewat panggilan langsung ke Supabase
-- client di browser (mis. console: supabase.from('profiles').update(
-- {division:'all'})...). Sekarang kita menambah fitur "ubah profil
-- sendiri" (nama, foto, tema, bahasa) — momen yang tepat untuk sekalian
-- menutup celah ini dengan trigger, bukan cuma menambah kolom baru.
create or replace function public.protect_privileged_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Backend admin (service role client, dipakai src/app/dashboard/admin/
  -- actions.ts lewat "createAdminClient()" untuk ubah division staf) tetap
  -- bebas — hanya sesi authenticated biasa yang dibatasi di bawah ini.
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.division is distinct from old.division
     or new.role is distinct from old.role
     or new.username is distinct from old.username then
    raise exception 'RESTRICTED: division/role/username cuma bisa diubah admin, bukan pemilik akun sendiri.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_privileged_profile_columns on public.profiles;
create trigger protect_privileged_profile_columns
  before update on public.profiles
  for each row execute function public.protect_privileged_profile_columns();

-- Bucket foto profil — satu folder per pengguna (nama file diawali
-- "<user_id>/...") supaya RLS storage bisa membatasi setiap orang cuma
-- boleh baca-tulis foldernya sendiri, beda dari product-photos (migrasi
-- 0013) yang dibatasi per-divisi karena memang dipakai bersama divisi.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
