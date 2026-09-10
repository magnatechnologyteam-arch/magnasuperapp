-- Tahap 22: lapis pertahanan KEDUA untuk validasi yang baru ditambahkan di
-- Server Action (src/lib/*/actions.ts) — CHECK constraint di database supaya
-- aturan dasarnya ("stok tidak boleh negatif", "total unit harus > 0", dst)
-- tetap berlaku APAPUN jalur penulisannya (RPC, Server Action lama yang
-- mungkin lolos dari audit, atau query manual dari Supabase Studio), bukan
-- cuma diandalkan dari validasi JS yang bisa saja suatu saat lupa dipanggil.
--
-- Dipasang `NOT VALID` (bukan divalidasi langsung ke semua baris lama) —
-- kalau kebetulan ada baris data lama yang sudah terlanjur menyalahi aturan
-- ini (mis. dari sebelum ada validasi), constraint `NOT VALID` tidak
-- memblokir migrasi ini jalan; constraint tetap otomatis berlaku untuk
-- SEMUA insert/update baru mulai sekarang. Baris lama bisa dirapikan lalu
-- di-`VALIDATE CONSTRAINT` belakangan kalau perlu — tidak wajib segera.

alter table public.magnarent_inventory
  add constraint magnarent_inventory_total_unit_check check (total_unit > 0) not valid;
alter table public.magnarent_inventory
  add constraint magnarent_inventory_unit_maintenance_check check (unit_maintenance >= 0) not valid;
alter table public.magnarent_inventory
  add constraint magnarent_inventory_price_per_day_check check (price_per_day >= 0) not valid;

alter table public.magnarent_bookings
  add constraint magnarent_bookings_jumlah_unit_check check (jumlah_unit > 0) not valid;
alter table public.magnarent_bookings
  add constraint magnarent_bookings_dp_amount_check check (dp_amount >= 0) not valid;
alter table public.magnarent_bookings
  add constraint magnarent_bookings_tanggal_check check (tanggal_selesai >= tanggal_mulai) not valid;

alter table public.production_materials
  add constraint production_materials_stock_check check (stock >= 0) not valid;
alter table public.production_materials
  add constraint production_materials_min_stock_check check (min_stock >= 0) not valid;
alter table public.production_materials
  add constraint production_materials_price_per_unit_check check (price_per_unit >= 0) not valid;

alter table public.production_booth_projects
  add constraint production_booth_projects_budget_check check (budget >= 0) not valid;
alter table public.production_booth_projects
  add constraint production_booth_projects_dp_amount_check check (dp_amount >= 0) not valid;
alter table public.production_booth_projects
  add constraint production_booth_projects_tanggal_check check (tanggal_instalasi >= tanggal_mulai) not valid;

alter table public.magnative_projects
  add constraint magnative_projects_budget_check check (budget >= 0) not valid;
alter table public.magnative_projects
  add constraint magnative_projects_dp_amount_check check (dp_amount >= 0) not valid;
alter table public.magnative_projects
  add constraint magnative_projects_tanggal_check check (tanggal_selesai >= tanggal_mulai) not valid;

-- `magnative_project_costs.amount` SUDAH punya `check (amount >= 0)` inline
-- sejak migrasi 0017 (constraint bawaan Postgres bernama persis
-- `magnative_project_costs_amount_check`) — tidak perlu constraint baru di
-- sini, cukup validasi JS di addProjectCost (amount > 0, sedikit lebih ketat
-- dari DB) yang sudah ditambahkan di actions.ts.

alter table public.products
  add constraint products_price_check check (price >= 0) not valid;
alter table public.products
  add constraint products_stock_check check (stock >= 0) not valid;

alter table public.invoices
  add constraint invoices_subtotal_check check (subtotal >= 0) not valid;
alter table public.invoices
  add constraint invoices_total_check check (total >= 0) not valid;
