-- Balas (reply/kutip), edit, hapus pesan, dan hapus seluruh chat (Tahap 39)
-- — permintaan Owner lanjutan setelah fitur Chat & lampiran (migrasi
-- 0038/0039). Keputusan yang sudah dikonfirmasi Owner lewat pertanyaan
-- sebelumnya:
--   (a) Akses penuh BOLEH menghapus pesan siapa pun satu-satu (moderasi),
--       di luar fitur "hapus seluruh chat" (bersihkan satu ruang sekaligus).
--   (b) Edit/hapus pesan MILIK SENDIRI dibatasi 15 menit setelah terkirim
--       (di luar itu tombolnya hilang di UI) — akses penuh TIDAK terkena
--       batas waktu ini untuk moderasi.

-- 1) Kolom balas (reply) — snapshot DENORMALISASI persis seperti pola
-- sender_name/dst di migrasi 0038: kalau cuma simpan reply_to_id lalu di
-- JOIN saat tampil, RLS bisa menyembunyikan baris aslinya (atau baris
-- aslinya sudah dihapus/diedit) dan kutipannya jadi hilang/berubah. Snapshot
-- di sini merekam ISI KUTIPAN PERSIS SAAT membalas dibuat — tidak
-- ikut berubah kalau pesan asli belakangan diedit/dihapus (sama seperti
-- perilaku kutip-balas di WhatsApp/Slack).
alter table public.chat_messages
  add column if not exists reply_to_id uuid references public.chat_messages(id) on delete set null,
  add column if not exists reply_to_sender_name text,
  add column if not exists reply_to_body text,
  add column if not exists reply_to_attachment_name text;

-- 2) Kolom edit & hapus (soft-delete). Soft-delete (bukan DELETE baris
-- sungguhan) SENGAJA dipilih untuk hapus pesan SATU-SATU — supaya kutipan
-- balas (reply_to_*, lihat atas) di pesan LAIN yang mengutip pesan ini tetap
-- valid, dan supaya muncul tombstone "Pesan telah dihapus" seperti pola chat
-- pada umumnya. "Hapus SELURUH chat" (lihat kebijakan DELETE di bawah) beda
-- — itu memang membersihkan total riwayat satu ruang, jadi pakai DELETE asli.
alter table public.chat_messages
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

-- 3) RLS UPDATE — dipakai untuk EDIT teks dan SOFT-DELETE (set deleted_at).
-- Dua policy permissive terpisah (di Postgres, policy permissive untuk
-- command yang sama digabung dengan OR): pengirim sendiri (dibatasi 15
-- menit) ATAU akses penuh (tanpa batas waktu, untuk moderasi). Server Action
-- (src/lib/chat/actions.ts) yang memastikan payload UPDATE-nya cuma berisi
-- kolom yang relevan (body+edited_at untuk edit, deleted_at+deleted_by+
-- pengosongan lampiran untuk hapus) — sama seperti insert (migrasi 0038)
-- yang juga menaruh kepercayaan pada Server Action untuk kolom denormalisasi,
-- bukan RLS per-kolom.
drop policy if exists "chat_messages_update_own" on public.chat_messages;
create policy "chat_messages_update_own"
  on public.chat_messages for update
  to authenticated
  using (
    sender_id = auth.uid()
    and now() - created_at <= interval '15 minutes'
    and public.current_user_division() <> 'investor'
    and (
      room = 'bersama'
      or room = public.current_user_division()
      or public.current_user_division() = 'all'
    )
  )
  with check (sender_id = auth.uid());

drop policy if exists "chat_messages_update_moderation" on public.chat_messages;
create policy "chat_messages_update_moderation"
  on public.chat_messages for update
  to authenticated
  using (public.current_user_division() = 'all')
  with check (public.current_user_division() = 'all');

-- 4) RLS DELETE — HANYA dipakai untuk "Hapus Seluruh Chat" (bersihkan satu
-- ruang total), jadi dibatasi akses penuh saja. Hapus pesan satu-satu (baik
-- oleh pengirim sendiri maupun moderasi akses penuh) TIDAK lewat sini —
-- itu soft-delete (UPDATE, lihat atas), bukan DELETE baris.
drop policy if exists "chat_messages_delete_full_access" on public.chat_messages;
create policy "chat_messages_delete_full_access"
  on public.chat_messages for delete
  to authenticated
  using (public.current_user_division() = 'all');
