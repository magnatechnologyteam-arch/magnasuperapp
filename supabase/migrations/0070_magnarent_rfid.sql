-- RFID pelengkap QR per-unit (Gap laporan Bagian 5-C #17): tag RFID opsional
-- di tiap unit fisik, dipakai untuk bulk-scan gudang saat event besar (staf
-- scan banyak unit sekaligus lalu update status massal), TIDAK menggantikan
-- kode_unit/QR yang sudah ada -- murni identifier tambahan yang opsional.
alter table public.magnarent_inventory_units
  add column if not exists rfid_tag text;

create unique index if not exists magnarent_inventory_units_rfid_tag_key
  on public.magnarent_inventory_units (rfid_tag)
  where rfid_tag is not null;
