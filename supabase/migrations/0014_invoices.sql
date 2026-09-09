-- Faktur/Invoice lintas 3 divisi — dibuat dari booking Magnarent, proyek
-- Magnativ, atau proyek Production yang sudah ada, ATAU manual (tanpa
-- rujukan sumber sama sekali). Baris item & harga di-SNAPSHOT ke kolom
-- `items` (jsonb) saat invoice dibuat, supaya invoice yang sudah terbit
-- tidak ikut berubah kalau harga/booking sumbernya diedit belakangan.
--
-- PDF invoice di-generate on-demand oleh aplikasi (src/lib/invoices/pdf.tsx)
-- lewat @react-pdf/renderer, bukan file statis yang diupload manual:
--   - Tombol "Download PDF" di halaman Faktur men-stream PDF langsung lewat
--     src/app/api/invoices/[id]/pdf/route.ts (dilindungi sesi staf akses
--     penuh, sama seperti halaman lain di /dashboard/admin/**).
--   - Tombol "Kirim WA" meng-generate PDF yang sama lalu mengunggahnya ke
--     bucket `invoice-pdfs` di bawah supaya dapat URL publik yang bisa
--     diakses tanpa sesi staf (dipakai n8n/GOWA untuk mengambil filenya),
--     lalu URL itu dikirim ke webhook n8n yang sudah ada untuk WhatsApp bot
--     Magnarent (lihat src/lib/invoices/whatsapp.ts).
--
-- RLS sama seperti "products" (migrasi 0013): HANYA akses penuh
-- (current_user_division() = 'all'), karena faktur lintas divisi adalah
-- fitur admin, sama seperti Piutang & Pendapatan/Klien Terpadu/Laporan/
-- Aktivitas/Katalog Produk — BUKAN fitur per-divisi seperti booking/proyek
-- itu sendiri.

create sequence if not exists public.invoice_number_seq;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  -- Dieja "magnative" (bukan "magnativ") supaya konsisten dengan nama tabel
  -- magnative_clients/magnative_projects dan current_user_division() — beda
  -- dari kolom "division" di tabel products (migrasi 0013) yang terlanjur
  -- salah eja "magnativ", tapi di sana cuma label bebas jadi tidak masalah.
  division text not null check (division in ('magnarent', 'magnative', 'production')),
  -- Rujukan opsional ke booking/proyek sumber. TIDAK pakai foreign key
  -- (sumbernya bisa dari salah satu dari 3 tabel berbeda tergantung
  -- `source_type`, dan Postgres tidak punya FK polimorfik) — cuma jejak
  -- telusur. Invoice tetap utuh (snapshot di kolom `items`) walau booking/
  -- proyek sumbernya nanti diubah atau dihapus.
  source_type text check (source_type in ('magnarent_booking', 'magnative_project', 'production_booth')),
  source_id uuid,
  client_name text not null,
  client_phone text,
  -- Snapshot baris item saat invoice dibuat:
  -- [{ "description": "...", "qty": 1, "unit_price": 100000, "subtotal": 100000 }, ...]
  items jsonb not null default '[]',
  subtotal integer not null default 0,
  -- Sama dengan subtotal untuk sekarang (belum ada PPN) — kolom terpisah
  -- disiapkan supaya penambahan pajak/diskon belakangan tidak perlu migrasi
  -- ulang, cukup isi bedanya.
  total integer not null default 0,
  status text not null default 'Draft' check (status in ('Draft', 'Terkirim', 'Lunas')),
  issued_date date not null default current_date,
  due_date date,
  pdf_url text,
  pdf_storage_path text,
  catatan text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- Nomor faktur otomatis kalau tidak diisi manual saat insert:
-- INV/{tahun dibuat}/{urutan global 4 digit, dari sequence supaya aman dari
-- race condition kalau dua orang membuat invoice bersamaan}. Nomor urutnya
-- SENGAJA tidak reset per tahun (sequence global, cuma label tahunnya yang
-- mengikuti tanggal buat) — trade-off demi kesederhanaan & jaminan
-- anti-tabrakan; kalau ke depannya perlu nomor reset tiap tahun ala
-- software akuntansi, butuh logika counter per-tahun terpisah.
create or replace function public.generate_invoice_number()
returns trigger as $$
begin
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := 'INV/' || to_char(now(), 'YYYY') || '/' ||
      lpad(nextval('public.invoice_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger invoices_generate_number
  before insert on public.invoices
  for each row execute function public.generate_invoice_number();

alter table public.invoices enable row level security;

create policy invoices_access_full on public.invoices
  for all
  using (public.current_user_division() = 'all')
  with check (public.current_user_division() = 'all');

-- Bucket publik untuk PDF invoice yang sudah dikirim lewat WhatsApp (lihat
-- komentar di atas) — pola sama persis dengan `product-photos` (migrasi
-- 0013) dan `magnative-portfolio` (migrasi 0012).
insert into storage.buckets (id, name, public)
values ('invoice-pdfs', 'invoice-pdfs', true)
on conflict (id) do nothing;

create policy invoice_pdfs_read on storage.objects
  for select
  using (bucket_id = 'invoice-pdfs');

create policy invoice_pdfs_insert on storage.objects
  for insert
  with check (bucket_id = 'invoice-pdfs' and public.current_user_division() = 'all');

create policy invoice_pdfs_update on storage.objects
  for update
  using (bucket_id = 'invoice-pdfs' and public.current_user_division() = 'all');

create policy invoice_pdfs_delete on storage.objects
  for delete
  using (bucket_id = 'invoice-pdfs' and public.current_user_division() = 'all');
