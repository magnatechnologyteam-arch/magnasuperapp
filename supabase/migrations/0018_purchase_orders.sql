-- Modul Pembelian/PO (Purchasing) ringan untuk Production — jawaban atas
-- "stok menipis" yang sejauh ini cuma jadi badge peringatan tanpa ada
-- langkah lanjut di aplikasi (harus dicatat manual di luar sistem begitu
-- ada pemesanan ulang ke supplier). Sengaja dilingkupi Production dulu
-- (bukan sekaligus Magnarent) karena cuma modul ini yang sudah punya
-- konsep `min_stock`/"stok menipis" (migrasi 0006).
--
-- `material_id` nullable + ON DELETE SET NULL — sama seperti `client_id` di
-- magnative_projects: material boleh dihapus meski riwayat PO-nya masih
-- ada (UI fallback nama "—" untuk material yang sudah hilang).
create table if not exists public.production_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  material_id uuid references public.production_materials (id) on delete set null,
  supplier_name text not null,
  qty integer not null check (qty > 0),
  unit_price integer not null default 0 check (unit_price >= 0),
  status text not null default 'Dipesan' check (status in ('Dipesan', 'Diterima', 'Dibatalkan')),
  order_date date not null default current_date,
  expected_date date,
  received_date date,
  catatan text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.production_purchase_orders;
create trigger set_updated_at before update on public.production_purchase_orders
  for each row execute function public.set_updated_at();

alter table public.production_purchase_orders enable row level security;

drop policy if exists "production_purchase_orders_access" on public.production_purchase_orders;
create policy "production_purchase_orders_access"
  on public.production_purchase_orders for all
  to authenticated
  using (public.can_access_division('production'))
  with check (public.can_access_division('production'));

-- Fungsi atomik: tandai PO "Diterima" SEKALIGUS nambah stok material terkait
-- dalam satu transaksi — dipakai lewat `supabase.rpc()` dari
-- src/lib/production/actions.ts (bukan dua UPDATE terpisah dari app),
-- supaya tidak ada celah "PO ke-mark Diterima tapi stok gagal ke-update"
-- kalau koneksi putus di tengah jalan. `for update` mengunci baris PO
-- selama transaksi, mencegah PO yang sama di-"terima" dua kali kalau
-- tombolnya ke-klik dobel.
create or replace function public.receive_purchase_order(po_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  po record;
begin
  if not public.can_access_division('production') then
    raise exception 'Tidak punya akses ke divisi Production.';
  end if;

  select * into po from public.production_purchase_orders where id = po_id for update;

  if po is null then
    raise exception 'Purchase order tidak ditemukan.';
  end if;
  if po.status <> 'Dipesan' then
    raise exception 'Purchase order ini sudah berstatus %, tidak bisa ditandai diterima lagi.', po.status;
  end if;

  update public.production_purchase_orders
    set status = 'Diterima', received_date = current_date
    where id = po_id;

  if po.material_id is not null then
    update public.production_materials
      set stock = stock + po.qty
      where id = po.material_id;
  end if;
end;
$$;

grant execute on function public.receive_purchase_order(uuid) to authenticated;
