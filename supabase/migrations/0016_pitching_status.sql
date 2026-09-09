-- Tahap 4 dari roadmap peningkatan MagnaSuperApp (feedback investor yang
-- diteruskan owner soal modul Magnativ): tambah tahap "Pitching" SEBELUM
-- "Perencanaan" pada status proyek. Investor ingin laporan proyek yang juga
-- mencakup kapan pitching dilakukan dan berapa biayanya — kalau pitching
-- gagal/tidak lanjut pun, itu tetap tercatat sebagai pengeluaran nyata,
-- bukan cuma proyek yang sudah pasti deal.
--
-- Default kolom `status` diubah dari 'Perencanaan' jadi 'Pitching' — proyek
-- baru sekarang wajar dimulai dari tahap belum-pasti-deal ini dulu, sesuai
-- alur bisnis yang sebenarnya (pitching -> deal -> perencanaan -> berjalan).
alter table public.magnative_projects
  drop constraint if exists magnative_projects_status_check;
alter table public.magnative_projects
  add constraint magnative_projects_status_check
  check (status in ('Pitching', 'Perencanaan', 'Berjalan', 'Selesai', 'Dibatalkan'));
alter table public.magnative_projects
  alter column status set default 'Pitching';
