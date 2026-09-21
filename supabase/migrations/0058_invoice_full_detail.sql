-- Update terbaru (rombak total desain & fungsi invoice): "rombak total design
-- invoice, ambil semuanya dari sini serta isi fungsinya juga ditambah
-- sesuaikan dengan invoice ini" — merujuk contoh proforma invoice Magnarent
-- (INV/MGR/2026/09/003) yang dikirim Owner. Migrasi ini menambah kolom yang
-- sebelumnya SENGAJA tidak dipaksakan masuk saat item 7 "Update Opsional 1"
-- (lihat komentar lama di src/lib/invoices/pdf.tsx): detail acara/loading/
-- durasi/pengiriman, PIC pengirim invoice, ongkos kirim, deposit, metode
-- pembayaran (bank), catatan pembayaran, dan syarat & ketentuan.
--
-- PRINSIP AKUNTANSI PENTING (jangan diubah tanpa update
-- src/lib/accounting/actions.ts juga):
--   - `total` = subtotal (item) + shipping_cost. Keduanya PENDAPATAN riil,
--     dan `total` inilah yang dipakai postInvoiceLunasJournal sebagai
--     Debit Bank / Kredit Pendapatan saat status invoice jadi "Lunas".
--   - `deposit_amount` adalah jaminan yang DAPAT DIKEMBALIKAN ke klien —
--     BUKAN pendapatan, jadi SENGAJA TIDAK ikut `total` dan TIDAK PERNAH
--     diposting ke jurnal akuntansi. Cuma tampil informatif di PDF sebagai
--     "Total Dibayarkan" (= total + deposit_amount, dihitung saat render).
--
-- Semua kolom baru NULLABLE/default 0 dan TIDAK di-backfill dengan data
-- apa pun — data PIC/bank/dsb bersifat sensitif dan spesifik per invoice,
-- jadi wajib diisi manual oleh staf lewat form (lihat InvoiceManager.tsx),
-- bukan nilai baku yang ditanam di kode/migrasi.

alter table public.invoices
  add column if not exists document_label text,
  add column if not exists pic_name text,
  add column if not exists pic_phone text,
  add column if not exists event_name text,
  add column if not exists event_location text,
  add column if not exists event_date_label text,
  add column if not exists loading_info text,
  add column if not exists duration_label text,
  add column if not exists delivery_method text,
  add column if not exists shipping_cost integer not null default 0,
  add column if not exists deposit_amount integer not null default 0,
  add column if not exists deposit_label text,
  add column if not exists bank_name text,
  add column if not exists bank_account_holder text,
  add column if not exists bank_account_number text,
  add column if not exists payment_note text,
  add column if not exists terms_conditions text;

comment on column public.invoices.total is 'subtotal (item) + shipping_cost. Pendapatan riil dipakai jurnal akuntansi — TIDAK termasuk deposit_amount.';
comment on column public.invoices.deposit_amount is 'Deposit/jaminan yang dapat dikembalikan — BUKAN pendapatan, sengaja tidak ikut total/jurnal akuntansi. Cuma informatif di PDF.';
