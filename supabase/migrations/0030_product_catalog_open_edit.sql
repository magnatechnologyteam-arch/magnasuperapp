-- Tahap 29b: permintaan Owner — "katalog produk diubah jadi semua divisi
-- bisa akses edit". Sebelumnya (migrasi 0013/0029) TULIS (tambah/edit/
-- hapus/impor) di Katalog Produk cuma untuk division 'all' (Owner/
-- Finance) — sekarang dibuka untuk SEMUA staf yang login, apa pun
-- divisinya. BACA sudah terbuka untuk semua staf sejak migrasi 0029, jadi
-- tidak berubah.

drop policy if exists "products_write_full_access" on public.products;
create policy "products_write_all_staff"
  on public.products for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "product_photos_write_full_access" on public.product_photos;
create policy "product_photos_write_all_staff"
  on public.product_photos for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "product_import_sources_full_access" on public.product_import_sources;
create policy "product_import_sources_all_staff"
  on public.product_import_sources for all
  to authenticated
  using (true)
  with check (true);

-- Bucket foto produk: insert/update/delete juga dibuka untuk semua staf
-- login (bukan cuma division 'all' lagi) — baca tetap publik seperti
-- sebelumnya (kebijakan "product_photos_read" tidak berubah).
drop policy if exists "product_photos_insert" on storage.objects;
create policy "product_photos_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-photos');

drop policy if exists "product_photos_update" on storage.objects;
create policy "product_photos_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-photos')
  with check (bucket_id = 'product-photos');

drop policy if exists "product_photos_delete" on storage.objects;
create policy "product_photos_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-photos');
