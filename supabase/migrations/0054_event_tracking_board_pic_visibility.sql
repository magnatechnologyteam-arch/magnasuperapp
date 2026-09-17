-- Tahap D modul Tracking Progress Event: "Papan Tracking" butuh picker PIC
-- (pilih staf mana yang ditugaskan ke satu item checklist) yang bisa
-- menampilkan staf dari 3 divisi operasional lain, bukan cuma diri sendiri.
-- Kebijakan SELECT profiles yang ada ("Profil sendiri atau semua profil
-- untuk akses penuh") hanya izinkan lihat profil sendiri, akses penuh
-- (division 'all'), atau investor -- staf magnarent/magnative/production
-- tidak bisa saling lihat. Tambahkan policy SELECT baru (bersifat aditif,
-- di-OR dengan policy lama) supaya staf 3 divisi operasional bisa saling
-- lihat profil satu sama lain untuk keperluan penunjukan PIC, TANPA
-- membuka profil investor ke mereka (dan sebaliknya).
create policy "Lihat profil staf operasional untuk penunjukan PIC"
  on public.profiles
  for select
  to authenticated
  using (
    current_user_division() = any (array['magnarent', 'magnative', 'production', 'all'])
    and division = any (array['magnarent', 'magnative', 'production', 'all'])
  );
