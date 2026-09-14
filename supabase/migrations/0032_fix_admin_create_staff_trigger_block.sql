-- Bug: admin tidak bisa menambah staf baru — createUser() via Admin API
-- (email_confirm: true) membuat GoTrue melakukan INSERT lalu UPDATE kedua ke
-- auth.users (menandai email_confirmed_at) lewat KONEKSI LANGSUNG milik role
-- `supabase_auth_admin` (BUKAN lewat PostgREST). Update kedua ini memicu
-- trigger handle_new_user() lagi, yang menjalankan cabang ON CONFLICT DO
-- UPDATE ke public.profiles — lalu memicu trigger
-- protect_privileged_profile_columns (BEFORE UPDATE). Trigger itu cuma
-- meloloskan kalau auth.role() = 'service_role', tapi auth.role() membaca
-- GUC request.jwt.claims yang CUMA di-set PostgREST untuk request lewat
-- REST API — koneksi langsung GoTrue ke Postgres tidak pernah men-set GUC
-- itu, jadi auth.role() selalu NULL di jalur ini. Trigger jadi salah
-- mengira ini perubahan oleh pemilik akun sendiri dan menolaknya, sehingga
-- SETIAP percobaan tambah staf baru gagal (error 500 dari GoTrue) — persis
-- yang dilaporkan pengguna.
--
-- Perbaikan: tambahkan jalur aman kedua yang mengenali koneksi Auth Server
-- Supabase sendiri lewat session_user (konsisten sepanjang pemanggilan
-- walau fungsi ini SECURITY DEFINER, beda dengan current_user) — role
-- supabase_auth_admin HANYA dipakai GoTrue untuk koneksi internal, staf/
-- pengguna biasa lewat PostgREST tidak pernah terhubung dengan role ini,
-- jadi aman tanpa melemahkan proteksi terhadap pemilik akun yang mencoba
-- ubah division/role/username miliknya sendiri.
create or replace function public.protect_privileged_profile_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.role() = 'service_role' or session_user = 'supabase_auth_admin' then
    return new;
  end if;

  if new.division is distinct from old.division
     or new.role is distinct from old.role
     or new.username is distinct from old.username then
    raise exception 'RESTRICTED: division/role/username cuma bisa diubah admin, bukan pemilik akun sendiri.';
  end if;

  return new;
end;
$function$;
