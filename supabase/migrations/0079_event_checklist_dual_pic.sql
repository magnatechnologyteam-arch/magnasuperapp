-- Tahap 52: pisah PIC jadi 2 peran per item checklist -- "PIC Produksi"
-- (kolom pic lama, tanggung jawab fase Design/Mockup/Sample/Production)
-- dan "PIC Lapangan" (kolom baru pic_lapangan, tanggung jawab fase
-- Completed/Loading In/Loading Out/Finish). Keputusan Owner: mekanisme
-- checklist dirasa masih rumit, salah satu penyebabnya 1 PIC dipaksa
-- tanggung jawab dari produksi sampai lapangan padahal beda orang di
-- lapangan (Rafly/Satya dkk vs tim lapangan event day).
alter table event_checklist_items
  add column if not exists pic_lapangan uuid references auth.users(id) on delete set null;

comment on column event_checklist_items.pic_lapangan is
  'PIC Lapangan -- bertanggung jawab fase Completed, Loading In, Loading Out, Finish. Terpisah dari kolom pic ("PIC Produksi", fase Design/Mockup/Sample/Production).';

-- Backfill: supaya assignment yang sudah ada tidak hilang begitu saja,
-- default PIC Lapangan = PIC Produksi yang sudah ditugaskan (Admin/PIC
-- bisa ganti manual lewat dropdown baru kalau memang beda orang).
update event_checklist_items
set pic_lapangan = pic
where pic_lapangan is null and pic is not null;
