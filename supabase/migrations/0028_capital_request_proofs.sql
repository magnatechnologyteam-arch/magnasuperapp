-- Tahap 28d: fitur baru Investor —
-- (1) upload bukti pembayaran saat pengajuan modal disetujui (riwayat
--     keputusan Approve/Reject sendiri SUDAH ada sejak migrasi 0019, lihat
--     seksi "Riwayat Keputusan" di CapitalRequestInbox.tsx — tahap ini cuma
--     menambah lampiran buktinya),
-- (2) grafik tren bulanan & (3) ekspor laporan PDF: keduanya dihitung dari
--     data `capital_requests` yang sudah ada, TIDAK butuh tabel/kolom baru,
-- (4) ringkasan otomatis berkala (push): cron baru di
--     src/app/api/cron/investor-capital-summary/route.ts, juga tidak butuh
--     tabel baru — cuma query `capital_requests` yang sudah ada.
--
-- Jadi migrasi ini HANYA untuk item (1): dua kolom bukti pembayaran + bucket
-- Storage-nya + satu fungsi database untuk menulisnya dengan aman.

-- 1) Dua kolom baru di capital_requests untuk lampiran bukti pembayaran.
-- Nullable dengan sengaja: mengunggah bukti itu OPSIONAL saat approve (Owner
-- kadang transfer belakangan), dan investor tetap harus bisa Approve tanpa
-- bukti dulu lalu melengkapinya nanti dari kartu "Riwayat Keputusan".
alter table public.capital_requests
  add column if not exists payment_proof_url text,
  add column if not exists payment_proof_storage_path text;

-- 2) Bucket Storage untuk bukti pembayaran — pola sama persis dengan
-- `production-checks`/`magnarent-checks` (migrasi 0025/0027): public bucket
-- (path-nya berisi UUID acak, tidak gampang ditebak) supaya URL publiknya
-- bisa langsung dipakai di <img>/link tanpa signed URL yang ribet, tapi
-- insert/update/delete DIBATASI cuma investor lewat kebijakan di bawah —
-- BUKAN `can_access_division()` seperti modul operasional, karena bukti
-- pembayaran ini murni urusan investor, bukan divisi Magnarent/Magnative/
-- Production/Admin manapun.
insert into storage.buckets (id, name, public)
values ('capital-request-proofs', 'capital-request-proofs', true)
on conflict (id) do nothing;

drop policy if exists "capital_request_proofs_read" on storage.objects;
create policy "capital_request_proofs_read"
  on storage.objects for select
  to public
  using (bucket_id = 'capital-request-proofs');

drop policy if exists "capital_request_proofs_insert" on storage.objects;
create policy "capital_request_proofs_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'capital-request-proofs' and public.current_user_is_investor());

drop policy if exists "capital_request_proofs_update" on storage.objects;
create policy "capital_request_proofs_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'capital-request-proofs' and public.current_user_is_investor())
  with check (bucket_id = 'capital-request-proofs' and public.current_user_is_investor());

drop policy if exists "capital_request_proofs_delete" on storage.objects;
create policy "capital_request_proofs_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'capital-request-proofs' and public.current_user_is_investor());

-- 3) Investor TIDAK punya policy UPDATE di `capital_requests` sama sekali
-- (lihat migrasi 0019 — cuma SELECT, dan menulis keputusan lewat fungsi
-- `decide_capital_request`). Jadi menyimpan URL bukti pembayaran juga harus
-- lewat fungsi SECURITY DEFINER serupa, BUKAN update biasa dari klien:
-- mengecek ulang bahwa pemanggilnya investor, dan HANYA mengizinkan bukti
-- ditempelkan ke pengajuan yang statusnya sudah "Disetujui" (kalau masih
-- "Menunggu"/"Ditolak", belum ada pembayaran yang perlu dibuktikan).
-- `proof_url`/`proof_path` boleh dikirim NULL untuk menghapus bukti yang
-- sudah ada (investor salah unggah, mau ganti file).
create or replace function public.set_capital_request_payment_proof(
  request_id uuid,
  proof_url text,
  proof_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req record;
begin
  if not public.current_user_is_investor() then
    raise exception 'Hanya akun investor yang bisa mengelola bukti pembayaran.';
  end if;

  select * into req from public.capital_requests where id = request_id for update;

  if req is null then
    raise exception 'Pengajuan modal tidak ditemukan.';
  end if;
  if req.status <> 'Disetujui' then
    raise exception 'Bukti pembayaran hanya bisa dilampirkan pada pengajuan yang sudah disetujui.';
  end if;

  update public.capital_requests
    set payment_proof_url = proof_url, payment_proof_storage_path = proof_path
    where id = request_id;
end;
$$;

grant execute on function public.set_capital_request_payment_proof(uuid, text, text) to authenticated;
