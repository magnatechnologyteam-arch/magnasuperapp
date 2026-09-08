-- Jalankan file ini di Supabase Dashboard → SQL Editor → New query → Run.
-- Membuat tabel `profiles` (satu baris per anggota tim yang login), RLS,
-- dan trigger otomatis supaya profil terisi begitu ada yang daftar lewat
-- halaman /register.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Trigger: begitu ada baris baru di auth.users (artinya ada yang berhasil
-- mendaftar lewat /register), otomatis buatkan baris profiles yang
-- berpasangan — nama diambil dari metadata "full_name" yang dikirim form
-- pendaftaran, dengan fallback ke bagian sebelum "@" di email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
