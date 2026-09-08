-- RPC untuk bot WhatsApp Magnarent (n8n) — supaya bot bisa cek ketersediaan
-- alat dan cari produk lewat SATU panggilan HTTP ke endpoint PostgREST
-- (/rest/v1/rpc/<nama_fungsi>), tanpa perlu menulis ulang logika bentrok di
-- n8n. Dipanggil pakai service role key dari n8n, jadi otomatis melewati RLS
-- — memang itu tujuannya: bot perlu baca data lintas sesi login staf.

create or replace function public.check_item_availability(
  p_item_id uuid,
  p_start date,
  p_end date,
  p_exclude_booking_id uuid default null
)
returns table (
  item_name text,
  total_unit integer,
  available_unit integer
)
language sql
stable
as $$
  select
    i.name,
    i.total_unit - i.unit_maintenance as total_unit,
    (i.total_unit - i.unit_maintenance) - coalesce((
      select sum(b.jumlah_unit)
      from public.magnarent_bookings b
      where b.item_id = p_item_id
        and b.status in ('Menunggu', 'Dikonfirmasi')
        and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
        and b.tanggal_mulai <= p_end
        and b.tanggal_selesai >= p_start
    ), 0) as available_unit
  from public.magnarent_inventory i
  where i.id = p_item_id;
$$;

grant execute on function public.check_item_availability(uuid, date, date, uuid) to service_role;

create or replace function public.search_inventory(p_keyword text default null)
returns table (
  id uuid,
  name text,
  category text,
  price_per_day numeric,
  total_available integer
)
language sql
stable
as $$
  select
    i.id,
    i.name,
    i.category,
    i.price_per_day,
    i.total_unit - i.unit_maintenance as total_available
  from public.magnarent_inventory i
  where p_keyword is null
     or i.name ilike '%' || p_keyword || '%'
     or i.category ilike '%' || p_keyword || '%'
  order by i.name;
$$;

grant execute on function public.search_inventory(text) to service_role;
