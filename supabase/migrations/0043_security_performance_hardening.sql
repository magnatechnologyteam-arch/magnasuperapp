-- Tahap 45 (audit "fitur apa yang perlu diperbaiki"): tiga perbaikan aman
-- dari Supabase Advisor, tidak mengubah perilaku aplikasi sama sekali,
-- cuma mengunci celah kecil & mempercepat query seiring data bertambah.

-- 1) Kunci search_path tiap fungsi (celah keamanan kecil: search_path yang
--    tidak dikunci bisa dibajak kalau ada skema lain bernama sama di masa
--    depan). Tidak mengubah logika fungsi sama sekali.
alter function public.current_user_division() set search_path = public, pg_temp;
alter function public.can_access_division(text) set search_path = public, pg_temp;
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.check_item_availability(uuid, date, date, uuid) set search_path = public, pg_temp;
alter function public.search_inventory(text) set search_path = public, pg_temp;
alter function public.generate_invoice_number() set search_path = public, pg_temp;
alter function public.current_user_is_investor() set search_path = public, pg_temp;

-- 2) Index untuk tiap foreign key yang belum ada index-nya — supaya JOIN
--    dan penghapusan baris induk tetap cepat begitu data (booking, invoice,
--    log aktivitas, dst) sudah ribuan baris.
create index if not exists activity_log_actor_id_idx on public.activity_log (actor_id);
create index if not exists capital_requests_decided_by_idx on public.capital_requests (decided_by);
create index if not exists capital_requests_submitted_by_idx on public.capital_requests (submitted_by);
create index if not exists chat_messages_deleted_by_idx on public.chat_messages (deleted_by);
create index if not exists chat_messages_reply_to_id_idx on public.chat_messages (reply_to_id);
create index if not exists chat_messages_sender_id_idx on public.chat_messages (sender_id);
create index if not exists invoices_created_by_idx on public.invoices (created_by);
create index if not exists magnarent_booking_checks_checked_by_idx on public.magnarent_booking_checks (checked_by);
create index if not exists magnarent_bookings_client_id_idx on public.magnarent_bookings (client_id);
create index if not exists magnarent_bookings_item_id_idx on public.magnarent_bookings (item_id);
create index if not exists magnarent_maintenance_logs_created_by_idx on public.magnarent_maintenance_logs (created_by);
create index if not exists magnarent_maintenance_logs_item_id_idx on public.magnarent_maintenance_logs (item_id);
create index if not exists magnative_content_posts_client_id_idx on public.magnative_content_posts (client_id);
create index if not exists magnative_content_requests_client_id_idx on public.magnative_content_requests (client_id);
create index if not exists magnative_content_requests_created_by_idx on public.magnative_content_requests (created_by);
create index if not exists magnative_creative_assets_uploaded_by_idx on public.magnative_creative_assets (uploaded_by);
create index if not exists magnative_project_costs_created_by_idx on public.magnative_project_costs (created_by);
create index if not exists magnative_projects_client_id_idx on public.magnative_projects (client_id);
create index if not exists production_booth_projects_client_id_idx on public.production_booth_projects (client_id);
create index if not exists production_equipment_usage_created_by_idx on public.production_equipment_usage (created_by);
create index if not exists production_equipment_usage_equipment_id_idx on public.production_equipment_usage (equipment_id);
create index if not exists production_equipment_usage_project_id_idx on public.production_equipment_usage (project_id);
create index if not exists production_project_checks_checked_by_idx on public.production_project_checks (checked_by);
create index if not exists production_project_crew_project_id_idx on public.production_project_crew (project_id);
create index if not exists production_project_photos_project_id_idx on public.production_project_photos (project_id);
create index if not exists production_project_photos_uploaded_by_idx on public.production_project_photos (uploaded_by);
create index if not exists production_purchase_orders_created_by_idx on public.production_purchase_orders (created_by);
create index if not exists production_purchase_orders_material_id_idx on public.production_purchase_orders (material_id);
create index if not exists system_status_updated_by_idx on public.system_status (updated_by);

-- 3) Bungkus auth.uid() jadi (select auth.uid()) di policy yang masih
--    mengevaluasinya ulang tiap baris — logika akses SAMA PERSIS, cuma
--    dievaluasi sekali per query (bukan per baris) supaya lebih cepat di
--    tabel besar. ALTER POLICY dipakai (bukan drop+create) supaya policy
--    tidak pernah hilang walau sesaat.
alter policy "Users can update their own profile" on public.profiles
  using ((select auth.uid()) = id);

alter policy "Profil sendiri atau semua profil untuk akses penuh" on public.profiles
  using (((select auth.uid()) = id) or current_user_has_full_access());

alter policy activity_log_insert_any_authenticated on public.activity_log
  with check ((select auth.uid()) is not null);

alter policy magnative_clients_select_any_authenticated on public.magnative_clients
  using ((select auth.uid()) is not null);

alter policy "Pengguna bisa lihat subscription miliknya" on public.push_subscriptions
  using ((select auth.uid()) = user_id);

alter policy "Pengguna bisa tambah subscription miliknya" on public.push_subscriptions
  with check ((select auth.uid()) = user_id);

alter policy "Pengguna bisa hapus subscription miliknya" on public.push_subscriptions
  using ((select auth.uid()) = user_id);

alter policy chat_messages_insert on public.chat_messages
  with check (
    (sender_id = (select auth.uid()))
    and (current_user_division() <> 'investor'::text)
    and ((room = 'bersama'::text) or (room = current_user_division()) or (current_user_division() = 'all'::text))
  );

alter policy chat_messages_update_own on public.chat_messages
  using (
    (sender_id = (select auth.uid()))
    and ((now() - created_at) <= '00:15:00'::interval)
    and (current_user_division() <> 'investor'::text)
    and ((room = 'bersama'::text) or (room = current_user_division()) or (current_user_division() = 'all'::text))
  )
  with check (sender_id = (select auth.uid()));
