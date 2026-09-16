-- Tahap 45 lanjutan: cabut akses EXECUTE dari PUBLIC (yang otomatis
-- diwarisi role anon — pengunjung belum login) untuk 8 fungsi SECURITY
-- DEFINER yang seharusnya cuma dipakai lewat aplikasi setelah login, lalu
-- kasih lagi eksplisit ke authenticated saja.
--
-- Sudah dicek satu-satu sebelum diterapkan:
-- - decide_capital_request, receive_purchase_order, save_booking_checked,
--   save_booth_project_checked, set_capital_request_payment_proof: cuma
--   dipanggil dari Server Action (src/lib/*/actions.ts), yang selalu jalan
--   dengan sesi pengguna yang sudah login (role authenticated) — anon
--   tidak pernah butuh akses ini.
-- - handle_new_user: trigger AFTER INSERT/UPDATE di auth.users (dijalankan
--   Supabase Auth sendiri, bukan lewat role anon/authenticated) — mencabut
--   akses PUBLIC tidak memengaruhi trigger-nya sama sekali.
-- - protect_privileged_profile_columns: trigger juga, sama seperti di atas.
-- - current_user_has_full_access: cuma dipakai di dalam RLS policy.
--
-- Role authenticated SENGAJA tetap dikasih akses penuh seperti sebelumnya
-- — alur aplikasi untuk pengguna yang sudah login tidak berubah sama
-- sekali. Ini murni menutup celah "orang belum login bisa memanggil
-- endpoint RPC ini langsung lewat API".
revoke execute on function public.current_user_has_full_access() from public;
grant execute on function public.current_user_has_full_access() to authenticated;

revoke execute on function public.decide_capital_request(uuid, text, text) from public;
grant execute on function public.decide_capital_request(uuid, text, text) to authenticated;

revoke execute on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to authenticated;

revoke execute on function public.protect_privileged_profile_columns() from public;
grant execute on function public.protect_privileged_profile_columns() to authenticated;

revoke execute on function public.receive_purchase_order(uuid) from public;
grant execute on function public.receive_purchase_order(uuid) to authenticated;

revoke execute on function public.save_booking_checked(uuid, uuid, uuid, text, text, date, date, integer, text, integer, text) from public;
grant execute on function public.save_booking_checked(uuid, uuid, uuid, text, text, date, date, integer, text, integer, text) to authenticated;

revoke execute on function public.save_booth_project_checked(uuid, text, uuid, text, text, text, date, date, integer, text, integer, jsonb, text) from public;
grant execute on function public.save_booth_project_checked(uuid, text, uuid, text, text, text, date, date, integer, text, integer, jsonb, text) to authenticated;

revoke execute on function public.set_capital_request_payment_proof(uuid, text, text) from public;
grant execute on function public.set_capital_request_payment_proof(uuid, text, text) to authenticated;
