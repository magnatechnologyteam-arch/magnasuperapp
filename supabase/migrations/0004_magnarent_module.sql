-- Migrasi data modul Magnarent (inventaris alat + booking) dari mock data
-- di memori (src/lib/magnarent/mock-data.ts) ke tabel Supabase sungguhan —
-- supaya datanya permanen (tidak hilang tiap refresh/restart) dan sama
-- untuk semua orang di divisi Magnarent, bukan cuma per-browser.

create extension if not exists pgcrypto;

-- Helper akses per-divisi, dipakai lintas modul (Magnarent/Magnative/
-- Production). Beda dari `current_user_has_full_access()` di 0003 (yang
-- baca tabel `profiles`): ini baca langsung dari klaim JWT `app_metadata`
-- yang sudah ada di setiap request tanpa query tabel tambahan, jadi tidak
-- butuh SECURITY DEFINER dan tidak berisiko "infinite recursion".
create or replace function public.current_user_division()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'division', 'production');
$$;

create or replace function public.can_access_division(target text)
returns boolean
language sql
stable
as $$
  select public.current_user_division() = 'all' or public.current_user_division() = target;
$$;

-- Trigger generik: isi ulang `updated_at` setiap kali baris diubah, dipakai
-- bersama oleh semua tabel data operasional (Magnarent/Magnative/Production).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.magnarent_inventory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  location text not null,
  price_per_day integer not null default 0,
  total_unit integer not null default 1,
  unit_maintenance integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- `item_id` SENGAJA nullable + ON DELETE SET NULL (bukan RESTRICT): alat
-- boleh dihapus meski masih ada booking SELESAI/DIBATALKAN yang menyebutnya
-- (histori tetap tersimpan, UI sudah menampilkan "—" untuk alat yang hilang
-- — lihat `itemName` di BookingScheduler.tsx). Booking AKTIF tetap diblokir
-- di level aplikasi (`deleteInventoryItem` di actions.ts), sama seperti
-- perilaku lama saat data masih di memori.
create table if not exists public.magnarent_bookings (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.magnarent_inventory (id) on delete set null,
  nama_klien text not null,
  telepon_klien text,
  tanggal_mulai date not null,
  tanggal_selesai date not null,
  jumlah_unit integer not null,
  status text not null default 'Menunggu' check (status in ('Menunggu', 'Dikonfirmasi', 'Selesai', 'Dibatalkan')),
  status_pembayaran text not null default 'Belum Bayar' check (status_pembayaran in ('Belum Bayar', 'DP', 'Lunas')),
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.magnarent_inventory;
create trigger set_updated_at before update on public.magnarent_inventory
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.magnarent_bookings;
create trigger set_updated_at before update on public.magnarent_bookings
  for each row execute function public.set_updated_at();

alter table public.magnarent_inventory enable row level security;
alter table public.magnarent_bookings enable row level security;

-- Satu policy per tabel untuk semua operasi (SELECT/INSERT/UPDATE/DELETE):
-- staf Magnarent dan akun akses penuh ('all') boleh baca-tulis penuh,
-- divisi lain tidak bisa lihat baris ini sama sekali.
drop policy if exists "magnarent_inventory_access" on public.magnarent_inventory;
create policy "magnarent_inventory_access"
  on public.magnarent_inventory for all
  to authenticated
  using (public.can_access_division('magnarent'))
  with check (public.can_access_division('magnarent'));

drop policy if exists "magnarent_bookings_access" on public.magnarent_bookings;
create policy "magnarent_bookings_access"
  on public.magnarent_bookings for all
  to authenticated
  using (public.can_access_division('magnarent'))
  with check (public.can_access_division('magnarent'));

-- Seed data — persis sama dengan INITIAL_INVENTORY/INITIAL_BOOKINGS lama di
-- mock-data.ts, supaya begitu migrasi ini jalan, tampilan di aplikasi TIDAK
-- berubah sama sekali (cuma sumber datanya yang sekarang permanen di DB).
-- ID dibuat tetap (bukan random) supaya baris booking di bawah bisa
-- menunjuk ke baris inventaris yang benar dalam satu file yang sama.
insert into public.magnarent_inventory (id, name, category, location, price_per_day, total_unit, unit_maintenance) values
  ('a0000000-0000-4000-8000-000000000001', 'Tenda Roder 5x10m', 'Tenda & Struktur', 'Gudang Cikarang', 850000, 8, 1),
  ('a0000000-0000-4000-8000-000000000002', 'Kursi Chiavari Putih', 'Furnitur', 'Gudang Pusat', 15000, 200, 0),
  ('a0000000-0000-4000-8000-000000000003', 'Sound System JBL 15"', 'Audio', 'Gudang Pusat', 450000, 6, 0),
  ('a0000000-0000-4000-8000-000000000004', 'Genset Silent 20kVA', 'Elektrikal', 'Gudang Cikarang', 1200000, 4, 1),
  ('a0000000-0000-4000-8000-000000000005', 'LED Screen P3 (per panel)', 'Visual', 'Gudang Pusat', 350000, 40, 2)
on conflict (id) do nothing;

insert into public.magnarent_bookings (id, item_id, nama_klien, telepon_klien, tanggal_mulai, tanggal_selesai, jumlah_unit, status, status_pembayaran) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'PT Sinergi Membangun', '0812-3456-7890', '2026-09-10', '2026-09-12', 3, 'Dikonfirmasi', 'DP'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'Yayasan Bina Cita', '0813-2345-6789', '2026-09-09', '2026-09-09', 2, 'Menunggu', 'Belum Bayar'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'Wedding Andra & Kirana', '0821-9988-7766', '2026-09-15', '2026-09-16', 150, 'Dikonfirmasi', 'Lunas'),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'Konser Amal Kota', '0857-1122-3344', '2026-09-07', '2026-09-08', 2, 'Dikonfirmasi', 'DP')
on conflict (id) do nothing;
