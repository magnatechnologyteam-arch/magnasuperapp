-- Permintaan Owner: "katalog produk dibuat bisa menghubungkan ke beberapa
-- produk yang ada di 3 divisi" — sebelumnya satu produk cuma bisa ditandai
-- SATU divisi (kolom `division`, single value: magnarent/magnativ/
-- production/umum). Sekarang ditambah kolom `divisions` (array) supaya satu
-- produk yang memang dipakai lintas divisi (mis. kabel HDMI dipakai
-- Magnarent DAN Production) bisa ditandai ke semua divisi yang relevan
-- sekaligus, bukan dipaksa pilih satu atau ditumpuk di "Umum".
--
-- Kolom `division` (lama, single value) SENGAJA tetap dipertahankan apa
-- adanya sebagai "divisi utama" — dipakai buat generate prefix SKU
-- (src/lib/products/sku.ts, mis. "MR-001") supaya format SKU yang sudah ada
-- tidak berubah. `divisions` (baru) adalah sumber kebenaran untuk tampilan,
-- filter, dan akses lintas divisi di UI mulai sekarang.
alter table public.products
  add column if not exists divisions text[] not null default '{}';

update public.products
set divisions = array[division]
where divisions = '{}' or divisions is null;

alter table public.products
  drop constraint if exists products_divisions_not_empty;
alter table public.products
  add constraint products_divisions_not_empty check (array_length(divisions, 1) > 0);

create index if not exists products_divisions_idx on public.products using gin (divisions);

-- Perbaikan pencarian global (RPC `global_search`, migrasi 0022):
-- 1) Hasil kategori "Produk" mengarah ke `/dashboard/admin/produk` — halaman
--    itu diblokir middleware untuk staf non-akses-penuh (lihat
--    ADMIN_PREFIX di src/middleware.ts), jadi staf yang cari produk lalu
--    klik hasilnya cuma dilempar balik ke Dashboard tanpa penjelasan.
--    Diarahkan ke `/dashboard/katalog-produk` (halaman yang sama, tapi di
--    luar prefix admin — sudah bisa diakses semua divisi sejak migrasi 0030).
-- 2) Pencarian pakai satu pola ILIKE '%<seluruh input>%' — kalau pengguna
--    mengetik lebih dari satu kata ("kalimat", mis. "samsung tv" untuk
--    produk bernama "Samsung Smart TV LED"), pola itu mencari "samsung tv"
--    sebagai SATU teks berurutan yang tidak pernah cocok, padahal kedua
--    kata itu memang ada di judulnya (cuma tidak bersebelahan persis).
--    Diperbaiki dengan memecah input jadi kata-kata lalu mensyaratkan
--    SEMUA kata itu muncul (boleh di mana saja, urutan bebas) di kolom yang
--    sama — jauh lebih sesuai ekspektasi pencarian pada umumnya.
create or replace function public.global_search(q text)
returns table (
  module text,
  entity_type text,
  entity_id uuid,
  title text,
  subtitle text,
  url text
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  words text[];
begin
  if length(trim(coalesce(q, ''))) < 2 then
    return;
  end if;

  -- Pecah jadi kata-kata (buang yang kosong akibat spasi berlebih), lalu
  -- setiap kata dibungkus jadi pola ILIKE '%kata%' sendiri-sendiri.
  select array_agg('%' || w || '%')
  into words
  from unnest(regexp_split_to_array(trim(q), '\s+')) as w
  where length(w) > 0;

  return query
    select 'magnarent'::text, 'Booking'::text, b.id, b.nama_klien,
      coalesce(i.name, 'Alat sudah dihapus') || ' — ' || b.tanggal_mulai::text || ' s/d ' || b.tanggal_selesai::text,
      '/dashboard/magnarent/booking'::text
    from public.magnarent_bookings b
    left join public.magnarent_inventory i on i.id = b.item_id
    where (coalesce(b.nama_klien, '') || ' ' || coalesce(b.telepon_klien, '') || ' ' || coalesce(b.catatan, '')) ilike all (words)
    limit 8;

  return query
    select 'magnarent'::text, 'Inventaris'::text, inv.id, inv.name,
      inv.category || ' — ' || inv.location,
      '/dashboard/magnarent/inventaris'::text
    from public.magnarent_inventory inv
    where (inv.name || ' ' || coalesce(inv.category, '') || ' ' || coalesce(inv.location, '')) ilike all (words)
    limit 8;

  return query
    select 'magnative'::text, 'Klien'::text, c.id, c.name,
      c.industry || coalesce(' — ' || c.pic_name, ''),
      '/dashboard/magnative/klien'::text
    from public.magnative_clients c
    where (c.name || ' ' || coalesce(c.industry, '') || ' ' || coalesce(c.pic_name, '') || ' ' || coalesce(c.pic_phone, '')) ilike all (words)
    limit 8;

  return query
    select 'magnative'::text, 'Proyek'::text, p.id, p.name,
      coalesce(mc.name, 'Tanpa klien') || ' — ' || p.status,
      '/dashboard/magnative/proyek'::text
    from public.magnative_projects p
    left join public.magnative_clients mc on mc.id = p.client_id
    where p.name ilike all (words)
    limit 8;

  return query
    select 'magnative'::text, 'Konten'::text, cp.id, cp.title,
      cp.platform || ' — ' || cp.status,
      '/dashboard/magnative/konten'::text
    from public.magnative_content_posts cp
    where cp.title ilike all (words)
    limit 8;

  return query
    select 'production'::text, 'Material'::text, m.id, m.name,
      m.category || ' — ' || m.location,
      '/dashboard/production/gudang'::text
    from public.production_materials m
    where (m.name || ' ' || coalesce(m.category, '') || ' ' || coalesce(m.location, '')) ilike all (words)
    limit 8;

  return query
    select 'production'::text, 'Proyek Booth'::text, bp.id, bp.name,
      bp.nama_klien || ' — ' || bp.lokasi_acara,
      '/dashboard/production/proyek'::text
    from public.production_booth_projects bp
    where (bp.name || ' ' || coalesce(bp.nama_klien, '') || ' ' || coalesce(bp.lokasi_acara, '')) ilike all (words)
    limit 8;

  return query
    select 'production'::text, 'Purchase Order'::text, po.id, po.supplier_name,
      'Qty ' || po.qty::text || ' — ' || po.status,
      '/dashboard/production/pembelian'::text
    from public.production_purchase_orders po
    where po.supplier_name ilike all (words)
    limit 8;

  return query
    select 'admin'::text, 'Produk'::text, pr.id, pr.name,
      coalesce(nullif(pr.sku, ''), pr.category),
      '/dashboard/katalog-produk'::text
    from public.products pr
    where (pr.name || ' ' || coalesce(pr.sku, '') || ' ' || coalesce(pr.category, '') || ' ' || coalesce(pr.supplier, '')) ilike all (words)
    limit 8;

  return query
    select 'admin'::text, 'Invoice'::text, iv.id, iv.invoice_number,
      iv.client_name || ' — ' || iv.status,
      '/dashboard/admin/faktur'::text
    from public.invoices iv
    where (iv.invoice_number || ' ' || iv.client_name) ilike all (words)
    limit 8;

  return query
    select 'admin'::text, 'Pengajuan Modal'::text, cr.id, cr.event_name,
      cr.location || ' — ' || cr.status,
      '/dashboard/admin/pengajuan-modal'::text
    from public.capital_requests cr
    where (cr.event_name || ' ' || cr.location) ilike all (words)
    limit 8;
end;
$$;

grant execute on function public.global_search(text) to authenticated;
