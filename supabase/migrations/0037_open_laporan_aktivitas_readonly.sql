-- Tahap 35 — buka "Laporan" & "Aktivitas" (sebelumnya akses-penuh-only,
-- sama seperti "Kelola Pengguna") ke 3 divisi operasional (Magnarent/
-- Magnative/Production), TAPI read-only dan DIBATASI cuma data divisi
-- sendiri — bukan versi lintas-divisi yang selama ini dilihat akses penuh.
--
-- "Laporan" (src/app/dashboard/admin/laporan/page.tsx) tidak butuh policy
-- baru: halaman itu memakai client Supabase biasa (bukan admin/service-role),
-- jadi query ke tabel magnarent_bookings/magnative_projects/dst. SUDAH
-- otomatis dibatasi RLS `can_access_division(...)` yang sudah ada sejak
-- awal (staf Magnarent memang cuma boleh baca tabel Magnarent, dst.) — sisi
-- kode di page.tsx yang sengaja diubah supaya cuma tampilkan tabel yang
-- relevan dengan divisi peminta.
--
-- "Aktivitas" beda ceritanya: tabel `activity_log` SEBELUM migrasi ini
-- cuma punya policy SELECT untuk akses penuh (`activity_log_select_full_access`)
-- dan investor (`activity_log_select_investor`) — staf 3 divisi operasional
-- belum pernah dikasih akses SELECT sama sekali. Policy baru di bawah
-- MEMBUKA akses itu, TAPI dibatasi cuma baris `module` milik divisinya
-- sendiri (bukan "admin" atau divisi lain) — sejalan dengan filter yang
-- sudah dipaksa di page.tsx (query param `modul` diabaikan untuk
-- non-akses-penuh). Tidak ada policy UPDATE/DELETE baru untuk mereka —
-- tetap cuma bisa dibaca, sesuai permintaan "read only".
create policy "activity_log_select_own_division" on public.activity_log
for select
using (module = public.current_user_division());
