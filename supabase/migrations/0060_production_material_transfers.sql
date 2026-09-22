-- Tahap 45: Transfer stok material antar gudang/lokasi (Production) --
-- gap #8 analisis-gap-production.md (prioritas rendah, tapi bisa langsung
-- dikerjakan tanpa bahan eksternal). Material di Production selalu satu
-- baris = satu lokasi (production_materials.location), jadi "transfer"
-- berarti: kurangi stok di baris asal, lalu tambah stok di baris tujuan
-- yang cocok (nama+kategori+satuan sama, lokasi tujuan) -- kalau belum
-- ada baris material di lokasi tujuan, baris baru dibuat otomatis
-- (metadata disalin dari baris asal). Ditulis sebagai SATU fungsi atomik
-- (pola sama persis dengan receive_purchase_order di migrasi 0018) supaya
-- tidak ada celah "stok asal sudah berkurang tapi tujuan gagal bertambah"
-- kalau koneksi putus di tengah jalan.

create table public.production_material_transfers (
  id uuid primary key default gen_random_uuid(),
  material_id uuid references public.production_materials (id) on delete set null,
  material_name text not null,
  qty integer not null check (qty > 0),
  from_location text not null,
  to_location text not null,
  catatan text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.production_material_transfers enable row level security;
create policy production_material_transfers_select on public.production_material_transfers
  for select using (can_access_division('production') or current_user_is_investor());
create policy production_material_transfers_insert on public.production_material_transfers
  for insert with check (can_access_division('production'));
-- Riwayat transfer TIDAK bisa diubah/dihapus dari UI (jejak audit) --
-- sengaja tidak dikasih policy update/delete sama sekali, sama seperti PO
-- yang sudah "Diterima" diblokir hapus.

create index production_material_transfers_material_id_idx
  on public.production_material_transfers (material_id);

create or replace function public.transfer_material_stock(
  p_material_id uuid,
  p_qty integer,
  p_to_location text,
  p_catatan text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  src record;
  dest record;
  v_to_location text := trim(p_to_location);
begin
  if not public.can_access_division('production') then
    raise exception 'Tidak punya akses ke divisi Production.';
  end if;

  if p_qty is null or p_qty <= 0 then
    raise exception 'Jumlah transfer harus lebih dari 0.';
  end if;
  if v_to_location = '' then
    raise exception 'Lokasi tujuan wajib diisi.';
  end if;

  select * into src from public.production_materials where id = p_material_id for update;
  if src is null then
    raise exception 'Material tidak ditemukan.';
  end if;
  if v_to_location = src.location then
    raise exception 'Lokasi tujuan tidak boleh sama dengan lokasi asal (%).', src.location;
  end if;
  if p_qty > src.stock then
    raise exception 'Stok "%" di % cuma %, tidak cukup untuk transfer % unit.', src.name, src.location, src.stock, p_qty;
  end if;

  update public.production_materials set stock = stock - p_qty where id = src.id;

  select * into dest from public.production_materials
    where name = src.name and category = src.category and unit = src.unit and location = v_to_location
    order by created_at
    limit 1
    for update;

  if dest is null then
    insert into public.production_materials (name, category, unit, location, stock, min_stock, price_per_unit)
      values (src.name, src.category, src.unit, v_to_location, p_qty, src.min_stock, src.price_per_unit);
  else
    update public.production_materials set stock = stock + p_qty where id = dest.id;
  end if;

  insert into public.production_material_transfers
    (material_id, material_name, qty, from_location, to_location, catatan, created_by)
    values (src.id, src.name, p_qty, src.location, v_to_location, nullif(trim(p_catatan), ''), auth.uid());
end;
$$;

grant execute on function public.transfer_material_stock(uuid, integer, text, text) to authenticated;
