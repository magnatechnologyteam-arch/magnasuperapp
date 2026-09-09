-- Tahap 1 dari roadmap peningkatan MagnaSuperApp (dibahas setelah owner
-- minta aplikasi dikembangkan melebihi referensi seperti Accurate/HoneyBook/
-- Booqable): DP dicatat sebagai NOMINAL RIIL, bukan cuma label status "DP"
-- seperti sebelumnya — supaya "Piutang & Pendapatan" bisa menghitung sisa
-- tagihan yang SEBENARNYA (total - dp_amount), bukan nilai penuh booking/
-- proyek. Ini menutup keterbatasan yang sebelumnya sudah dicatat jujur di
-- komentar src/app/dashboard/admin/keuangan/page.tsx.
--
-- Default 0 dan NOT NULL supaya baris lama (dibuat sebelum kolom ini ada)
-- otomatis dianggap belum ada DP tercatat — tidak mengubah perilaku yang
-- sudah ada sampai staf mulai mengisi nominal DP-nya secara manual.
alter table public.magnarent_bookings add column if not exists dp_amount integer not null default 0;
alter table public.magnative_projects add column if not exists dp_amount integer not null default 0;
alter table public.production_booth_projects add column if not exists dp_amount integer not null default 0;
