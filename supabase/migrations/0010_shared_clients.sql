-- Menyatukan data klien lintas 3 modul. Sebelum ini, "nama klien" di
-- booking Magnarent dan proyek booth Production cuma teks bebas — klien
-- yang sama yang juga tercatat di Magnative (magnative_clients) terlihat
-- sebagai tiga entitas terpisah tanpa hubungan sama sekali. Migrasi ini
-- menjadikan `magnative_clients` sebagai "buku alamat klien" bersama:
-- kepemilikan datanya (tambah/ubah/hapus) tetap di tangan tim Magnative,
-- tapi modul lain sekarang boleh MEMBACA daftar ini untuk menautkan
-- booking/proyek mereka ke klien yang sudah tercatat.
--
-- `nama_klien` (teks bebas) di Magnarent & Production TETAP ada dan tetap
-- wajib diisi — client_id ini cuma tautan TAMBAHAN yang opsional, bukan
-- pengganti, supaya staf tetap bisa mencatat klien one-off yang belum
-- terdaftar di Magnative tanpa terhalang.

-- Policy SELECT baru untuk siapa pun yang login (Postgres RLS meng-OR-kan
-- beberapa policy permissive untuk perintah yang sama — jadi ini menambah,
-- bukan menggantikan, policy "magnative_clients_access" yang sudah ada).
drop policy if exists "magnative_clients_select_any_authenticated" on public.magnative_clients;
create policy "magnative_clients_select_any_authenticated"
  on public.magnative_clients for select
  to authenticated
  using (auth.uid() is not null);

-- Nullable + ON DELETE SET NULL, pola sama persis dengan `client_id` di
-- magnative_projects (migrasi 0005): riwayat booking/proyek tetap ada
-- meski suatu saat catatan klien-nya dihapus dari Magnative.
alter table public.magnarent_bookings
  add column if not exists client_id uuid references public.magnative_clients (id) on delete set null;

alter table public.production_booth_projects
  add column if not exists client_id uuid references public.magnative_clients (id) on delete set null;
