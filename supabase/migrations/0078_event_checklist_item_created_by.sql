-- Tahap F modul Tracking Progress Event -- staf 3 divisi operasional kini
-- bisa menambah item checklist SENDIRI langsung dari Papan Tracking
-- (sebelumnya cuma Admin lewat /dashboard/admin/events/[id], meski RLS
-- event_checklist_items_insert sudah terbuka ke 3 divisi sejak migrasi
-- 0053 -- cuma tombolnya yang belum ada di UI staf). `created_by` dipakai
-- untuk membatasi staf HANYA bisa edit/hapus item yang DIA SENDIRI
-- tambahkan (bukan item Admin/staf lain) dari Papan Tracking -- lihat
-- guard baru di actions.ts (addEventChecklistItem/updateEventChecklistItem/
-- deleteEventChecklistItem). NULL untuk seluruh item lama (dibuat sebelum
-- kolom ini ada) -- konsisten dengan "item buatan Admin, staf tidak bisa
-- edit/hapus dari Papan Tracking, tetap lewat halaman Admin seperti biasa".
alter table public.event_checklist_items
  add column if not exists created_by uuid references auth.users (id) on delete set null;
