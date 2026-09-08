-- Menyamakan tracking status pembayaran di ketiga modul. Sebelum ini,
-- cuma Magnarent (magnarent_bookings) yang punya `status_pembayaran`
-- ("Belum Bayar"/"DP"/"Lunas") — proyek booth Production dan proyek
-- Magnative cuma punya `budget` tanpa status bayar, jadi tim tidak bisa
-- melihat mana klien yang piutangnya belum lunas di 2 lini bisnis itu.
-- Sekarang, dengan Direktori Klien Terpadu (migrasi 0010) sudah
-- menggabungkan riwayat klien lintas modul, ketimpangan ini makin terasa.
--
-- Default 'Belum Bayar' berlaku juga untuk baris yang SUDAH ada (proyek
-- lama) — itu asumsi paling aman: tim finance perlu tinjau ulang manual
-- proyek lama yang sebenarnya sudah lunas, tapi tidak ada risiko proyek
-- yang sebenarnya belum dibayar malah otomatis tercatat "Lunas".

alter table public.production_booth_projects
  add column if not exists status_pembayaran text not null default 'Belum Bayar'
    check (status_pembayaran in ('Belum Bayar', 'DP', 'Lunas'));

alter table public.magnative_projects
  add column if not exists status_pembayaran text not null default 'Belum Bayar'
    check (status_pembayaran in ('Belum Bayar', 'DP', 'Lunas'));
