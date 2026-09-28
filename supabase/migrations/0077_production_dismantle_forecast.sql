-- Forecast material reuse ke depan (analisis-kompetitor #25) --
-- "berdasarkan jadwal dismantle proyek lain yang sedang berjalan", BUKAN
-- cuma laporan historis (MaterialReuseReport yang sudah ada). Untuk itu
-- proyek booth butuh field baru: estimasi tanggal bongkar (opsional, diisi
-- manual staf) -- sebelumnya cuma ada tanggal_instalasi (deadline pasang),
-- tidak ada tanggal bongkar sama sekali. Kolom NULLABLE supaya proyek lama
-- tanpa data ini tetap jalan normal, dan RPC `save_booth_project_checked`
-- (migrasi 0020) di-`create or replace` dengan SATU parameter baru di
-- ujung (default null) -- aman untuk pemanggilan lama karena Supabase JS
-- selalu mengirim parameter RPC sebagai object bernama (named), bukan
-- posisional.

alter table public.production_booth_projects
  add column if not exists tanggal_bongkar_estimasi date;

-- WAJIB drop dulu: menambah parameter baru mengubah signature fungsi
-- (jumlah argumen), jadi `create or replace` di bawah akan membuat OVERLOAD
-- baru berdampingan dengan versi 13-parameter lama (bukan menggantikannya)
-- kalau versi lama tidak di-drop -- dan itu bikin ambigu saat dipanggil
-- dengan persis 13 argumen bernama (parameter ke-14 punya default).
drop function if exists public.save_booth_project_checked(
  uuid, text, uuid, text, text, text, date, date, integer, text, integer, jsonb, text
);

create or replace function public.save_booth_project_checked(
  p_project_id uuid,
  p_name text,
  p_client_id uuid,
  p_nama_klien text,
  p_lokasi_acara text,
  p_status text,
  p_tanggal_mulai date,
  p_tanggal_instalasi date,
  p_budget integer,
  p_status_pembayaran text,
  p_dp_amount integer,
  p_materials jsonb,
  p_catatan text,
  p_tanggal_bongkar_estimasi date default null
)
returns public.production_booth_projects
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_statuses text[] := array['Desain', 'Produksi', 'Finishing', 'Instalasi'];
  v_result public.production_booth_projects;
  v_lock_id uuid;
  v_item jsonb;
  v_material_id uuid;
  v_qty integer;
  v_stock integer;
  v_material_name text;
  v_allocated integer;
begin
  if not public.can_access_division('production') then
    raise exception 'Tidak punya akses ke divisi Production.';
  end if;

  if p_status = any(v_active_statuses) then
    for v_lock_id in
      select distinct (elem->>'materialId')::uuid
      from jsonb_array_elements(coalesce(p_materials, '[]'::jsonb)) elem
      order by 1
    loop
      perform pg_advisory_xact_lock(hashtext(v_lock_id::text));
    end loop;

    for v_item in select * from jsonb_array_elements(coalesce(p_materials, '[]'::jsonb))
    loop
      v_material_id := (v_item->>'materialId')::uuid;
      v_qty := (v_item->>'qty')::integer;

      select stock, name into v_stock, v_material_name
      from public.production_materials where id = v_material_id;

      if v_stock is null then
        continue;
      end if;

      select coalesce(sum((m->>'qty')::integer), 0) into v_allocated
      from public.production_booth_projects p,
           jsonb_array_elements(p.materials) m
      where p.status = any(v_active_statuses)
        and (p_project_id is null or p.id <> p_project_id)
        and (m->>'materialId')::uuid = v_material_id;

      if v_qty > (v_stock - v_allocated) then
        raise exception 'RACE_CONFLICT: Stok "%" baru saja dipakai proyek lain — tersisa %, diminta %. Coba cek ulang alokasinya.',
          v_material_name, (v_stock - v_allocated), v_qty;
      end if;
    end loop;
  end if;

  if p_project_id is null then
    insert into public.production_booth_projects (
      name, client_id, nama_klien, lokasi_acara, status, tanggal_mulai, tanggal_instalasi,
      budget, status_pembayaran, dp_amount, materials, catatan, tanggal_bongkar_estimasi
    ) values (
      p_name, p_client_id, p_nama_klien, p_lokasi_acara, p_status, p_tanggal_mulai, p_tanggal_instalasi,
      p_budget, p_status_pembayaran, coalesce(p_dp_amount, 0), coalesce(p_materials, '[]'::jsonb), p_catatan,
      p_tanggal_bongkar_estimasi
    )
    returning * into v_result;
  else
    update public.production_booth_projects set
      name = p_name,
      client_id = p_client_id,
      nama_klien = p_nama_klien,
      lokasi_acara = p_lokasi_acara,
      status = p_status,
      tanggal_mulai = p_tanggal_mulai,
      tanggal_instalasi = p_tanggal_instalasi,
      budget = p_budget,
      status_pembayaran = p_status_pembayaran,
      dp_amount = coalesce(p_dp_amount, 0),
      materials = coalesce(p_materials, '[]'::jsonb),
      catatan = p_catatan,
      tanggal_bongkar_estimasi = p_tanggal_bongkar_estimasi
    where id = p_project_id
    returning * into v_result;

    if v_result is null then
      raise exception 'Proyek booth ini sudah tidak ada — mungkin sudah dihapus lebih dulu.';
    end if;
  end if;

  return v_result;
end;
$$;

grant execute on function public.save_booth_project_checked(
  uuid, text, uuid, text, text, text, date, date, integer, text, integer, jsonb, text, date
) to authenticated;
