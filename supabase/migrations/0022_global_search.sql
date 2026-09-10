-- Tahap 23: pencarian global lintas modul — satu kotak cari di header yang
-- menembus SEMUA tabel data operasional sekaligus (booking, inventaris,
-- klien/proyek/konten Magnative, material/proyek booth Production, produk,
-- invoice, pengajuan modal), bukan cuma satu modul yang sedang dibuka.
--
-- SENGAJA `security invoker` (bukan `security definer` seperti
-- `receive_purchase_order`/`decide_capital_request`) — pencarian ini HARUS
-- ikut dibatasi RLS milik tiap tabel persis seperti kalau staf itu membuka
-- modulnya langsung: staf Magnarent yang cari sesuatu tidak boleh
-- kebetulan "nemu" invoice atau pengajuan modal (tabel admin-only) lewat
-- pencarian, padahal dia tidak pernah bisa lihat itu lewat menu biasa.
-- Investor & akun akses penuh otomatis kebagian hasil lebih luas karena
-- policy SELECT tambahan mereka (migrasi 0019) tetap berlaku di sini juga.
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
  term text;
begin
  -- Minimal 2 karakter — di bawah itu hampir semua baris ikut cocok
  -- (mahal dihitung, hasilnya juga tidak berguna buat pengguna).
  if length(trim(coalesce(q, ''))) < 2 then
    return;
  end if;
  term := '%' || trim(q) || '%';

  return query
    select 'magnarent'::text, 'Booking'::text, b.id, b.nama_klien,
      coalesce(i.name, 'Alat sudah dihapus') || ' — ' || b.tanggal_mulai::text || ' s/d ' || b.tanggal_selesai::text,
      '/dashboard/magnarent/booking'::text
    from public.magnarent_bookings b
    left join public.magnarent_inventory i on i.id = b.item_id
    where b.nama_klien ilike term or b.telepon_klien ilike term or b.catatan ilike term
    limit 8;

  return query
    select 'magnarent'::text, 'Inventaris'::text, inv.id, inv.name,
      inv.category || ' — ' || inv.location,
      '/dashboard/magnarent/inventaris'::text
    from public.magnarent_inventory inv
    where inv.name ilike term or inv.category ilike term or inv.location ilike term
    limit 8;

  return query
    select 'magnative'::text, 'Klien'::text, c.id, c.name,
      c.industry || coalesce(' — ' || c.pic_name, ''),
      '/dashboard/magnative/klien'::text
    from public.magnative_clients c
    where c.name ilike term or c.industry ilike term or c.pic_name ilike term or c.pic_phone ilike term
    limit 8;

  return query
    select 'magnative'::text, 'Proyek'::text, p.id, p.name,
      coalesce(mc.name, 'Tanpa klien') || ' — ' || p.status,
      '/dashboard/magnative/proyek'::text
    from public.magnative_projects p
    left join public.magnative_clients mc on mc.id = p.client_id
    where p.name ilike term
    limit 8;

  return query
    select 'magnative'::text, 'Konten'::text, cp.id, cp.title,
      cp.platform || ' — ' || cp.status,
      '/dashboard/magnative/konten'::text
    from public.magnative_content_posts cp
    where cp.title ilike term
    limit 8;

  return query
    select 'production'::text, 'Material'::text, m.id, m.name,
      m.category || ' — ' || m.location,
      '/dashboard/production/gudang'::text
    from public.production_materials m
    where m.name ilike term or m.category ilike term or m.location ilike term
    limit 8;

  return query
    select 'production'::text, 'Proyek Booth'::text, bp.id, bp.name,
      bp.nama_klien || ' — ' || bp.lokasi_acara,
      '/dashboard/production/proyek'::text
    from public.production_booth_projects bp
    where bp.name ilike term or bp.nama_klien ilike term or bp.lokasi_acara ilike term
    limit 8;

  return query
    select 'production'::text, 'Purchase Order'::text, po.id, po.supplier_name,
      'Qty ' || po.qty::text || ' — ' || po.status,
      '/dashboard/production/pembelian'::text
    from public.production_purchase_orders po
    where po.supplier_name ilike term
    limit 8;

  return query
    select 'admin'::text, 'Produk'::text, pr.id, pr.name,
      coalesce(nullif(pr.sku, ''), pr.category),
      '/dashboard/admin/produk'::text
    from public.products pr
    where pr.name ilike term or pr.sku ilike term or pr.category ilike term or pr.supplier ilike term
    limit 8;

  return query
    select 'admin'::text, 'Invoice'::text, iv.id, iv.invoice_number,
      iv.client_name || ' — ' || iv.status,
      '/dashboard/admin/faktur'::text
    from public.invoices iv
    where iv.invoice_number ilike term or iv.client_name ilike term
    limit 8;

  return query
    select 'admin'::text, 'Pengajuan Modal'::text, cr.id, cr.event_name,
      cr.location || ' — ' || cr.status,
      '/dashboard/admin/pengajuan-modal'::text
    from public.capital_requests cr
    where cr.event_name ilike term or cr.location ilike term
    limit 8;
end;
$$;

grant execute on function public.global_search(text) to authenticated;
