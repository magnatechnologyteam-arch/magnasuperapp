-- Update Opsional 1 (item 1 & 6) — kotak masuk notifikasi PERSISTEN di
-- dalam aplikasi, di sebelah Pencarian Global di Topbar. Melengkapi Web
-- Push (migrasi 0002) yang sifatnya EPHEMERAL/browser-only dan butuh
-- opt-in eksplisit tiap perangkat — sebelum migrasi ini, kejadian bisnis
-- (booking baru, event baru, dst) HANYA sempat "lewat" sebagai push kalau
-- kebetulan staf sudah aktifkan & sedang online; kalau tidak, tidak ada
-- jejaknya sama sekali di dalam app. Item 6 (notifikasi event baru belum
-- tampil ke semua divisi) adalah GEJALA dari ketiadaan penyimpanan ini,
-- bukan bug di titik panggil `notifyDivision` — begitu funnel terpusat di
-- src/lib/push/notify.ts ikut menulis ke tabel ini, semua ~15 titik
-- panggil yang sudah ada (booking/proyek/event/chat @-tag/dst) otomatis
-- ikut tersimpan tanpa perlu disentuh satu per satu.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  url text,
  -- Divisi tujuan SEBELUM auto-tambah 'all' oleh notifyDivision — akun akses
  -- penuh tetap bisa lihat semua baris lewat current_user_has_full_access()
  -- di policy bawah, terlepas dari isi kolom ini.
  target_divisions text[] not null default '{}',
  -- Dipakai notifyUsers (mis. @-tag Chat) — daftar user_id spesifik yang
  -- dituju di luar mekanisme per-divisi.
  target_user_ids uuid[] not null default '{}',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists notifications_created_at_idx on public.notifications (created_at desc);

alter table public.notifications enable row level security;

-- Baca: akses penuh lihat semua; selain itu lihat kalau divisinya termasuk
-- target_divisions ATAU dia disebut langsung di target_user_ids.
drop policy if exists "notifications_read" on public.notifications;
create policy "notifications_read"
  on public.notifications for select
  to authenticated
  using (
    public.current_user_has_full_access()
    or public.current_user_division() = any (target_divisions)
    or auth.uid() = any (target_user_ids)
  );

-- Tulis HANYA lewat service role (dipanggil dari notify.ts pakai
-- createAdminClient(), persis pola push_subscriptions) — sengaja tidak ada
-- policy insert/update/delete untuk role authenticated.

-- Status "sudah dibaca" per pengguna — dipisah dari tabel notifications
-- sendiri supaya satu notifikasi bisa dibaca sebagian orang & belum oleh
-- yang lain (satu baris notifikasi ditujukan ke banyak staf sekaligus).
create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

alter table public.notification_reads enable row level security;

drop policy if exists "notification_reads_select_own" on public.notification_reads;
create policy "notification_reads_select_own"
  on public.notification_reads for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "notification_reads_insert_own" on public.notification_reads;
create policy "notification_reads_insert_own"
  on public.notification_reads for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "notification_reads_delete_own" on public.notification_reads;
create policy "notification_reads_delete_own"
  on public.notification_reads for delete
  to authenticated
  using (auth.uid() = user_id);
