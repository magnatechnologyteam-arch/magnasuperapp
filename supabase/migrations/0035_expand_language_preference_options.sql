-- Tahap 33 — buka pilihan bahasa ke Melayu ('ms') & Mandarin ('zh'), selain
-- 'id'/'en' yang sudah ada sejak migrasi 0023. Konstrain lama tetap dijaga
-- (bukan dihapus tanpa pengganti) supaya baris dengan nilai tidak dikenal
-- tidak bisa masuk — cuma daftar nilai yang diterimanya diperluas.
alter table public.profiles
  drop constraint if exists profiles_language_preference_check;

alter table public.profiles
  add constraint profiles_language_preference_check
  check (language_preference in ('id', 'en', 'ms', 'zh'));
