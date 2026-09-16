-- Tahap 45 lanjutan: gabungkan 3 dari 16 kasus "multiple permissive
-- policies" yang AMAN digabung langsung (semuanya policy khusus SELECT/
-- UPDATE, tidak ada yang bentrok dengan policy "ALL"). 13 kasus sisanya
-- SENGAJA belum disentuh: semuanya bercampur dengan policy "ALL" (yang
-- otomatis berlaku untuk SELECT+INSERT+UPDATE+DELETE sekaligus) —
-- menggabungkannya langsung berisiko salah kasih akses insert/update/
-- delete ke investor. Itu perlu dipecah dulu jadi policy per aksi,
-- pekerjaan terpisah yang lebih hati-hati.
--
-- Pola aman: policy yang mau dipertahankan di-ALTER dulu supaya sudah
-- mencakup gabungan semua kondisi, BARU policy yang lain di-DROP — supaya
-- tidak pernah ada jeda akses yang lebih sempit dari seharusnya.

-- activity_log: 3 policy SELECT terpisah (akses penuh / investor / divisi
-- sendiri) jadi 1.
alter policy activity_log_select_own_division on public.activity_log
  using (
    (module = current_user_division())
    or (current_user_division() = 'all'::text)
    or current_user_is_investor()
  );
drop policy activity_log_select_full_access on public.activity_log;
drop policy activity_log_select_investor on public.activity_log;

-- chat_messages: 2 policy UPDATE (moderasi akses penuh / edit pesan
-- sendiri) jadi 1.
alter policy chat_messages_update_own on public.chat_messages
  using (
    (current_user_division() = 'all'::text)
    or (
      (sender_id = (select auth.uid()))
      and ((now() - created_at) <= '00:15:00'::interval)
      and (current_user_division() <> 'investor'::text)
      and ((room = 'bersama'::text) or (room = current_user_division()) or (current_user_division() = 'all'::text))
    )
  )
  with check (
    (current_user_division() = 'all'::text)
    or (sender_id = (select auth.uid()))
  );
drop policy chat_messages_update_moderation on public.chat_messages;

-- profiles: 2 policy SELECT (diri sendiri/akses penuh / investor) jadi 1.
alter policy "Profil sendiri atau semua profil untuk akses penuh" on public.profiles
  using (
    ((select auth.uid()) = id)
    or current_user_has_full_access()
    or current_user_is_investor()
  );
drop policy profiles_select_investor on public.profiles;
