-- Flag generik "penting" untuk notifikasi in-app + push (permintaan Owner:
-- notifikasi Event Baru harus tampil beda/mencolok dibanding notifikasi
-- biasa). Sengaja diberi nama generik (bukan "is_event") supaya bisa dipakai
-- ulang untuk jenis notifikasi penting lain di masa depan tanpa migrasi baru.
-- Tidak memengaruhi RLS -- kolom ini murni sinyal tampilan, bukan akses data.
alter table public.notifications
  add column if not exists is_important boolean not null default false;
