-- Tahap 35 — tambah "Alat & Perkakas" (production_equipment) ke pencarian
-- global. Bukan karena pencarian sebelumnya cuma "cari barang" (RPC
-- global_search di migrasi 0022/0034 sudah mencakup Booking, Inventaris,
-- Klien, Proyek, Konten, Material, Proyek Booth, Purchase Order, Invoice,
-- dan Pengajuan Modal sekaligus) — tapi karena HAMPIR SEMUA tabel bisnis di
-- database ini memang masih kosong (fresh install, cuma katalog produk &
-- pengajuan modal yang sudah diisi), jadi pencarian terasa "cuma nemu
-- produk" walau kodenya sudah mencakup semuanya. Alat & Perkakas ketinggalan
-- kena tambah karena belum ada di daftar module aslinya — sekarang dilengkapi.
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

  -- BARU (Tahap 35): Alat & Perkakas — sebelumnya tidak pernah termasuk
  -- pencarian sama sekali, padahal ini daftar aset production yang setara
  -- pentingnya dengan Inventaris (Magnarent) / Material (Production).
  return query
    select 'production'::text, 'Alat & Perkakas'::text, eq.id, eq.name,
      coalesce(nullif(eq.kategori, ''), 'Tanpa kategori') || ' — ' || coalesce(nullif(eq.kondisi, ''), 'Kondisi tidak dicatat'),
      '/dashboard/production/alat'::text
    from public.production_equipment eq
    where (eq.name || ' ' || coalesce(eq.kategori, '') || ' ' || coalesce(eq.catatan, '')) ilike all (words)
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
