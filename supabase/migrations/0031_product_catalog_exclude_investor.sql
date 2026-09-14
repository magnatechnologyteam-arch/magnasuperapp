-- Koreksi kecil ke migrasi 0030: "semua divisi bisa akses edit" (Tahap 29b)
-- dibaca sebagai magnarent/magnative/production/all (divisi operasional +
-- Owner/Finance) — TIDAK termasuk akun investor. Investor selama ini
-- selalu diposisikan read-only lintas divisi (lihat migrasi 0019:
-- "Read Only = menampilkan hasil dari masing-masing divisi, owner,
-- finance dan admin"), jadi kebijakan `using (true)`/`with check (true)`
-- di migrasi 0030 (yang mencakup SEMUA role authenticated, termasuk
-- investor) terlalu lebar dan tidak sengaja membuka investor bisa
-- tambah/edit/hapus produk. Diperbaiki di sini SEBELUM sempat dipakai,
-- bukan menanggapi laporan bug.

drop policy if exists "products_write_all_staff" on public.products;
create policy "products_write_all_staff"
  on public.products for all
  to authenticated
  using (public.current_user_division() <> 'investor')
  with check (public.current_user_division() <> 'investor');

drop policy if exists "product_photos_write_all_staff" on public.product_photos;
create policy "product_photos_write_all_staff"
  on public.product_photos for all
  to authenticated
  using (public.current_user_division() <> 'investor')
  with check (public.current_user_division() <> 'investor');

drop policy if exists "product_import_sources_all_staff" on public.product_import_sources;
create policy "product_import_sources_all_staff"
  on public.product_import_sources for all
  to authenticated
  using (public.current_user_division() <> 'investor')
  with check (public.current_user_division() <> 'investor');

drop policy if exists "product_photos_insert" on storage.objects;
create policy "product_photos_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-photos' and public.current_user_division() <> 'investor');

drop policy if exists "product_photos_update" on storage.objects;
create policy "product_photos_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-photos' and public.current_user_division() <> 'investor')
  with check (bucket_id = 'product-photos' and public.current_user_division() <> 'investor');

drop policy if exists "product_photos_delete" on storage.objects;
create policy "product_photos_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-photos' and public.current_user_division() <> 'investor');
