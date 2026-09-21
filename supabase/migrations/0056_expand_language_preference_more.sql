-- Update Opsional 1, item 4 — buka pilihan bahasa jadi 9 total: selain
-- 'id'/'en'/'ms'/'zh' yang sudah ada sejak migrasi 0023/0035, tambahkan
-- 'ja' (Jepang), 'ko' (Korea), 'ar' (Arab), 'fr' (Prancis), 'th' (Thai).
-- Sama seperti migrasi sebelumnya, konstrain lama tidak dihapus tanpa
-- pengganti — cuma daftar nilai yang diterimanya diperluas, supaya baris
-- dengan nilai tidak dikenal tetap tidak bisa masuk.
alter table public.profiles
  drop constraint if exists profiles_language_preference_check;

alter table public.profiles
  add constraint profiles_language_preference_check
  check (language_preference in ('id', 'en', 'ms', 'zh', 'ja', 'ko', 'ar', 'fr', 'th'));
