-- Tahap 21 (audit lanjutan pasca Tahap 16-20): tutup celah race condition
-- (TOCTOU — "time of check to time of use") di dua tempat yang menghitung
-- KETERSEDIAAN AGREGAT lintas beberapa baris sebelum insert/update:
--   - checkBookingCapacity (src/lib/magnarent/actions.ts) — kapasitas unit
--     alat pada rentang tanggal tertentu.
--   - checkMaterialAvailability (src/lib/production/actions.ts) — sisa stok
--     material yang belum teralokasi ke proyek booth aktif lain.
--
-- Pola lama: SELECT hitung ketersediaan di JS, lalu (kalau cukup) INSERT/
-- UPDATE terpisah. Kalau dua staf submit nyaris bersamaan untuk alat/
-- material yang sama, keduanya bisa lolos SELECT-nya sendiri-sendiri
-- sebelum salah satu sempat INSERT — hasilnya overbooking/overallocation
-- yang lolos tanpa pesan error apa pun. Probabilitasnya rendah (tim masih
-- kecil), tapi celahnya nyata.
--
-- Perbaikan: bungkus hitung-ulang + tulis jadi SATU fungsi database
-- (SECURITY DEFINER, pola sama seperti `receive_purchase_order` di migrasi
-- 0018 dan `decide_capital_request` di 0019), dikunci pakai
-- `pg_advisory_xact_lock` per alat/material supaya dua transaksi yang
-- rebutan resource YANG SAMA otomatis mengantre (bukan jalan paralel).
-- Pre-check di JS (checkBookingCapacity/checkMaterialAvailability) TETAP
-- dipakai apa adanya untuk pesan konflik yang informatif saat submit normal
-- (menampilkan booking/proyek apa saja yang bentrok) — fungsi di sini cuma
-- jaring pengaman TERAKHIR yang menutup celah waktu antara pre-check dan
-- penulisan sungguhan. Kalau race itu benar-benar kejadian (sangat jarang),
-- pesannya diawali "RACE_CONFLICT:" supaya action pemanggil bisa
-- menampilkannya sebagai pesan biasa (bukan error generik).

create or replace function public.save_booking_checked(
  p_booking_id uuid, -- null = insert booking baru, terisi = update booking ini
  p_item_id uuid,
  p_client_id uuid,
  p_nama_klien text,
  p_telepon_klien text,
  p_tanggal_mulai date,
  p_tanggal_selesai date,
  p_jumlah_unit integer,
  p_status_pembayaran text,
  p_dp_amount integer,
  p_catatan text
)
returns public.magnarent_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_booked integer;
  v_available integer;
  v_result public.magnarent_bookings;
begin
  if not public.can_access_division('magnarent') then
    raise exception 'Tidak punya akses ke divisi Magnarent.';
  end if;

  -- Kunci per alat — dua transaksi yang rebutan ITEM YANG SAMA otomatis
  -- mengantre di sini, dilepas otomatis begitu transaksi ini selesai.
  perform pg_advisory_xact_lock(hashtext(p_item_id::text));

  select * into v_item from public.magnarent_inventory where id = p_item_id;
  if v_item is null then
    raise exception 'Alat tidak ditemukan.';
  end if;

  -- Hitung ulang unit yang sudah dibooking (booking AKTIF lain yang
  -- rentangnya bersinggungan) — persis logika getBookedUnitsInRange di
  -- src/lib/magnarent/availability.ts, cuma sumbernya query SQL langsung
  -- (dalam transaksi yang sama dengan penguncian di atas) supaya datanya
  -- benar-benar terkini, bukan hasil SELECT terpisah dari beberapa saat lalu.
  select coalesce(sum(jumlah_unit), 0) into v_booked
  from public.magnarent_bookings
  where item_id = p_item_id
    and status in ('Menunggu', 'Dikonfirmasi')
    and (p_booking_id is null or id <> p_booking_id)
    and tanggal_mulai <= p_tanggal_selesai
    and p_tanggal_mulai <= tanggal_selesai;

  v_available := (v_item.total_unit - v_item.unit_maintenance) - v_booked;

  if p_jumlah_unit > v_available then
    raise exception 'RACE_CONFLICT: Slot "%" baru saja dipesan staf lain — tersisa % unit, diminta % unit. Coba cek ulang jadwalnya.',
      v_item.name, v_available, p_jumlah_unit;
  end if;

  if p_booking_id is null then
    insert into public.magnarent_bookings (
      item_id, client_id, nama_klien, telepon_klien, tanggal_mulai, tanggal_selesai,
      jumlah_unit, status, status_pembayaran, dp_amount, catatan
    ) values (
      p_item_id, p_client_id, p_nama_klien, p_telepon_klien, p_tanggal_mulai, p_tanggal_selesai,
      p_jumlah_unit, 'Menunggu', p_status_pembayaran, coalesce(p_dp_amount, 0), p_catatan
    )
    returning * into v_result;
  else
    update public.magnarent_bookings set
      item_id = p_item_id,
      client_id = p_client_id,
      nama_klien = p_nama_klien,
      telepon_klien = p_telepon_klien,
      tanggal_mulai = p_tanggal_mulai,
      tanggal_selesai = p_tanggal_selesai,
      jumlah_unit = p_jumlah_unit,
      status_pembayaran = p_status_pembayaran,
      dp_amount = coalesce(p_dp_amount, 0),
      catatan = p_catatan
    where id = p_booking_id
    returning * into v_result;

    if v_result is null then
      raise exception 'Booking ini sudah tidak ada — mungkin sudah dihapus lebih dulu.';
    end if;
  end if;

  return v_result;
end;
$$;

grant execute on function public.save_booking_checked(
  uuid, uuid, uuid, text, text, date, date, integer, text, integer, text
) to authenticated;

-- Padanan untuk proyek booth Production — satu proyek bisa minta BEBERAPA
-- material sekaligus (kolom jsonb `materials`), jadi perlu cek tiap baris
-- lalu kunci semua material yang terlibat SEBELUM mulai menghitung, supaya
-- tidak ada material yang "lolos" hitung karena keburu ditulis transaksi
-- lain di tengah loop. Dikunci berurutan (ORDER BY id) supaya dua proyek
-- yang sama-sama minta 2 material yang sama tapi urutan beda tidak saling
-- deadlock.
create or replace function public.save_booth_project_checked(
  p_project_id uuid, -- null = insert proyek baru, terisi = update proyek ini
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
  p_catatan text
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

  -- Cuma proyek berstatus AKTIF yang benar-benar menahan stok — sama
  -- seperti pengecekan `ACTIVE_BOOTH_STATUSES.includes(input.status)` di
  -- src/lib/production/actions.ts.
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

      -- Material sudah dihapus dari gudang — sama seperti findMaterialConflicts
      -- (src/lib/production/availability.ts) yang melewati baris begini, bukan
      -- menganggapnya error.
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
      budget, status_pembayaran, dp_amount, materials, catatan
    ) values (
      p_name, p_client_id, p_nama_klien, p_lokasi_acara, p_status, p_tanggal_mulai, p_tanggal_instalasi,
      p_budget, p_status_pembayaran, coalesce(p_dp_amount, 0), coalesce(p_materials, '[]'::jsonb), p_catatan
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
      catatan = p_catatan
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
  uuid, text, uuid, text, text, text, date, date, integer, text, integer, jsonb, text
) to authenticated;
