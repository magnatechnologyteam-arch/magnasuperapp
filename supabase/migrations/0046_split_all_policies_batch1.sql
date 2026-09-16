-- Tahap 45 lanjutan: 13 kasus "multiple permissive policies" yang tersisa
-- semuanya berasal dari kombinasi policy "ALL" (otomatis berlaku untuk
-- SELECT+INSERT+UPDATE+DELETE sekaligus) + policy SELECT terpisah untuk
-- investor/akses baca lain. Digabung langsung akan salah — investor bisa
-- ikut kebagian hak ubah/hapus. Jadi tiap policy ALL dipecah dulu jadi 4
-- policy terpisah per aksi (select/insert/update/delete), BARU policy
-- select-nya digabung dengan kondisi investor. Hasil akhirnya: SELECT
-- tetap union dari kondisi lama (divisi ATAU investor, sama seperti
-- sebelumnya), sementara insert/update/delete TETAP HANYA untuk divisi
-- terkait seperti sebelumnya (investor tidak pernah dapat hak itu, baik
-- sebelum maupun sesudah migrasi ini). Dipecah jadi 3 file migrasi supaya
-- lebih mudah ditinjau; batch 1 ini: capital_requests, invoices,
-- magnarent_bookings, magnarent_inventory.
begin;

-- capital_requests
create policy capital_requests_select on public.capital_requests
  for select to authenticated
  using ((current_user_division() = 'all'::text) or current_user_is_investor());
create policy capital_requests_insert on public.capital_requests
  for insert to authenticated
  with check (current_user_division() = 'all'::text);
create policy capital_requests_update on public.capital_requests
  for update to authenticated
  using (current_user_division() = 'all'::text)
  with check (current_user_division() = 'all'::text);
create policy capital_requests_delete on public.capital_requests
  for delete to authenticated
  using (current_user_division() = 'all'::text);
drop policy capital_requests_manage_full_access on public.capital_requests;
drop policy capital_requests_select_investor on public.capital_requests;

-- invoices (policy ALL lama berlaku untuk role public, dipertahankan sama)
create policy invoices_select on public.invoices
  for select to public
  using ((current_user_division() = 'all'::text) or current_user_is_investor());
create policy invoices_insert on public.invoices
  for insert to public
  with check (current_user_division() = 'all'::text);
create policy invoices_update on public.invoices
  for update to public
  using (current_user_division() = 'all'::text)
  with check (current_user_division() = 'all'::text);
create policy invoices_delete on public.invoices
  for delete to public
  using (current_user_division() = 'all'::text);
drop policy invoices_access_full on public.invoices;
drop policy invoices_select_investor on public.invoices;

-- magnarent_bookings
create policy magnarent_bookings_select on public.magnarent_bookings
  for select to authenticated
  using (can_access_division('magnarent'::text) or current_user_is_investor());
create policy magnarent_bookings_insert on public.magnarent_bookings
  for insert to authenticated
  with check (can_access_division('magnarent'::text));
create policy magnarent_bookings_update on public.magnarent_bookings
  for update to authenticated
  using (can_access_division('magnarent'::text))
  with check (can_access_division('magnarent'::text));
create policy magnarent_bookings_delete on public.magnarent_bookings
  for delete to authenticated
  using (can_access_division('magnarent'::text));
drop policy magnarent_bookings_access on public.magnarent_bookings;
drop policy magnarent_bookings_select_investor on public.magnarent_bookings;

-- magnarent_inventory
create policy magnarent_inventory_select on public.magnarent_inventory
  for select to authenticated
  using (can_access_division('magnarent'::text) or current_user_is_investor());
create policy magnarent_inventory_insert on public.magnarent_inventory
  for insert to authenticated
  with check (can_access_division('magnarent'::text));
create policy magnarent_inventory_update on public.magnarent_inventory
  for update to authenticated
  using (can_access_division('magnarent'::text))
  with check (can_access_division('magnarent'::text));
create policy magnarent_inventory_delete on public.magnarent_inventory
  for delete to authenticated
  using (can_access_division('magnarent'::text));
drop policy magnarent_inventory_access on public.magnarent_inventory;
drop policy magnarent_inventory_select_investor on public.magnarent_inventory;

commit;
