-- Tahap 45 lanjutan, batch 3 (terakhir): production_booth_projects,
-- production_materials, production_purchase_orders, product_photos,
-- products. Lihat penjelasan lengkap di 0046_split_all_policies_batch1.sql.
begin;

-- production_booth_projects
create policy production_booth_projects_select on public.production_booth_projects
  for select to authenticated
  using (can_access_division('production'::text) or current_user_is_investor());
create policy production_booth_projects_insert on public.production_booth_projects
  for insert to authenticated
  with check (can_access_division('production'::text));
create policy production_booth_projects_update on public.production_booth_projects
  for update to authenticated
  using (can_access_division('production'::text))
  with check (can_access_division('production'::text));
create policy production_booth_projects_delete on public.production_booth_projects
  for delete to authenticated
  using (can_access_division('production'::text));
drop policy production_booth_projects_access on public.production_booth_projects;
drop policy production_booth_projects_select_investor on public.production_booth_projects;

-- production_materials
create policy production_materials_select on public.production_materials
  for select to authenticated
  using (can_access_division('production'::text) or current_user_is_investor());
create policy production_materials_insert on public.production_materials
  for insert to authenticated
  with check (can_access_division('production'::text));
create policy production_materials_update on public.production_materials
  for update to authenticated
  using (can_access_division('production'::text))
  with check (can_access_division('production'::text));
create policy production_materials_delete on public.production_materials
  for delete to authenticated
  using (can_access_division('production'::text));
drop policy production_materials_access on public.production_materials;
drop policy production_materials_select_investor on public.production_materials;

-- production_purchase_orders
create policy production_purchase_orders_select on public.production_purchase_orders
  for select to authenticated
  using (can_access_division('production'::text) or current_user_is_investor());
create policy production_purchase_orders_insert on public.production_purchase_orders
  for insert to authenticated
  with check (can_access_division('production'::text));
create policy production_purchase_orders_update on public.production_purchase_orders
  for update to authenticated
  using (can_access_division('production'::text))
  with check (can_access_division('production'::text));
create policy production_purchase_orders_delete on public.production_purchase_orders
  for delete to authenticated
  using (can_access_division('production'::text));
drop policy production_purchase_orders_access on public.production_purchase_orders;
drop policy production_purchase_orders_select_investor on public.production_purchase_orders;

-- product_photos (baca: siapa saja yang login boleh lihat; tulis: staf
-- non-investor) — policy select "true" sudah mencakup kondisi ALL lama
-- untuk select, jadi cukup USING (true).
create policy product_photos_select on public.product_photos
  for select to authenticated
  using (true);
create policy product_photos_insert on public.product_photos
  for insert to authenticated
  with check (current_user_division() <> 'investor'::text);
create policy product_photos_update on public.product_photos
  for update to authenticated
  using (current_user_division() <> 'investor'::text)
  with check (current_user_division() <> 'investor'::text);
create policy product_photos_delete on public.product_photos
  for delete to authenticated
  using (current_user_division() <> 'investor'::text);
drop policy product_photos_write_all_staff on public.product_photos;
drop policy product_photos_read_all_staff on public.product_photos;

-- products (sama pola dengan product_photos, plus policy investor lama
-- yang sebenarnya sudah tercakup "true")
create policy products_select on public.products
  for select to authenticated
  using (true);
create policy products_insert on public.products
  for insert to authenticated
  with check (current_user_division() <> 'investor'::text);
create policy products_update on public.products
  for update to authenticated
  using (current_user_division() <> 'investor'::text)
  with check (current_user_division() <> 'investor'::text);
create policy products_delete on public.products
  for delete to authenticated
  using (current_user_division() <> 'investor'::text);
drop policy products_write_all_staff on public.products;
drop policy products_read_all_staff on public.products;
drop policy products_select_investor on public.products;

commit;
