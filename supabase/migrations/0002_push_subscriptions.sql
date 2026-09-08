-- Tabel penyimpanan Web Push subscription per pengguna.
-- Satu baris = satu "langganan" push dari satu browser/perangkat. Seorang
-- pengguna bisa punya lebih dari satu baris (mis. login di laptop & HP).
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Setiap pengguna hanya boleh melihat & mengelola subscription miliknya
-- sendiri. Pengiriman notifikasi sesungguhnya dilakukan dari Server Action
-- (server-side, pakai service role tidak diperlukan karena baca cukup lewat
-- sesi pengguna yang sedang login saat subscribe).
create policy "Pengguna bisa lihat subscription miliknya"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Pengguna bisa tambah subscription miliknya"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Pengguna bisa hapus subscription miliknya"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);
