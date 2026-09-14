-- Lampiran file/foto di fitur Chat (Tahap 38) — permintaan Owner: "bisa
-- menyisipkan file\foto\apapun untuk mempermudah progres tim". Scope jenis
-- file sudah dikonfirmasi Owner lewat pertanyaan sebelumnya: "Foto + dokumen
-- umum" (gambar JPG/PNG/WebP + PDF/Word/Excel), maksimal 10MB per file —
-- validasi tipe & ukuran dilakukan di server (sendChatMessage,
-- src/lib/chat/actions.ts), migrasi ini hanya menyiapkan kolom & bucket.

-- 1) Kolom lampiran di chat_messages — semuanya nullable karena SEBAGIAN
-- BESAR pesan tetap teks biasa tanpa lampiran sama sekali.
alter table public.chat_messages
  add column if not exists attachment_url text,
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint;

-- 2) Longgarkan constraint body: sebelumnya body WAJIB tidak kosong. Sekarang
-- pesan boleh HANYA lampiran tanpa teks sama sekali (mis. kirim foto tanpa
-- keterangan) — body cukup tidak kosong ATAU ada lampiran, batas panjang
-- 2000 karakter tetap berlaku seperti semula.
alter table public.chat_messages drop constraint if exists chat_messages_body_check;
alter table public.chat_messages
  add constraint chat_messages_body_check
  check (
    (char_length(btrim(body)) > 0 or attachment_url is not null)
    and char_length(body) <= 2000
  );

-- 3) Bucket Storage untuk lampiran chat — pola sama seperti
-- `capital-request-proofs` (migrasi 0028): public bucket (path berisi UUID
-- acak, tidak gampang ditebak) supaya URL publiknya langsung bisa dipakai di
-- <img>/link tanpa signed URL, insert dibatasi lewat RLS di bawah.
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do nothing;

drop policy if exists "chat_attachments_read" on storage.objects;
create policy "chat_attachments_read"
  on storage.objects for select
  to public
  using (bucket_id = 'chat-attachments');

-- Investor TIDAK PERNAH ikut chat (lihat migrasi 0038) — jadi juga tidak
-- boleh mengunggah lampiran chat sama sekali, sama seperti kebijakan insert
-- chat_messages itu sendiri.
drop policy if exists "chat_attachments_insert" on storage.objects;
create policy "chat_attachments_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'chat-attachments' and public.current_user_division() <> 'investor');

-- Sengaja TIDAK ADA policy UPDATE dari klien — lampiran pesan chat bersifat
-- permanen sama seperti pesannya sendiri (lihat komentar chat_messages_insert
-- di migrasi 0038). Policy DELETE tetap perlu ADA (beda dengan chat_messages
-- yang memang tidak boleh dihapus sama sekali) — khusus supaya
-- `sendChatMessage` (src/lib/chat/actions.ts) bisa membersihkan file yang
-- SUDAH terlanjur ter-upload kalau insert baris `chat_messages`-nya gagal
-- setelahnya (pola "upload lalu insert, bersihkan kalau insert gagal" yang
-- sama seperti proof pembayaran di migrasi 0028). Dibatasi `owner = auth.uid()`
-- supaya seseorang hanya bisa menghapus file yang DIA SENDIRI unggah, tidak
-- bisa menghapus lampiran orang lain.
drop policy if exists "chat_attachments_delete" on storage.objects;
create policy "chat_attachments_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'chat-attachments' and owner = auth.uid());
