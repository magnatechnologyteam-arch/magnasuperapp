-- Izinkan akses penuh MENGHAPUS baris log aktivitas lewat aplikasi
-- (tombol "Hapus" per baris + "Hapus Semua" di halaman Aktivitas).
--
-- Ini sengaja melonggarkan catatan di migrasi 0008 ("log ini immutable
-- lewat API biasa") atas permintaan eksplisit — supaya log yang menumpuk
-- bisa dibersihkan tanpa perlu buka Supabase langsung. Insert & select
-- tetap seperti semula (siapa pun login boleh menulis; cuma akses penuh
-- boleh membaca) — cuma delete yang ditambahkan, dan cuma untuk akses
-- penuh. Tidak ada policy update sama sekali — baris yang sudah tercatat
-- tetap tidak bisa DIUBAH, cuma bisa dihapus seluruhnya.
drop policy if exists "activity_log_delete_full_access" on public.activity_log;
create policy "activity_log_delete_full_access"
  on public.activity_log for delete
  to authenticated
  using (public.current_user_division() = 'all');
