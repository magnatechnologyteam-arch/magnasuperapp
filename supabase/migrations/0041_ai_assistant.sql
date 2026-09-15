-- Tahap 42: Asisten AI dalam aplikasi (permintaan Owner, dijalankan lewat
-- 9Router — gateway AI self-hosted milik Magna sendiri, endpoint gaya
-- OpenAI). BEDA dari fitur Chat tim (migrasi 0038): ini percakapan PRIBADI
-- satu arah user<->AI, bukan ruang bersama, dan SENGAJA terbuka untuk
-- SEMUA divisi TERMASUK investor (Chat tim mengecualikan investor, Asisten
-- AI ini tidak — dikonfirmasi Owner).
--
-- Desain tabel sengaja flat (satu baris per pesan, role 'user'/'assistant')
-- alih-alih menyimpan seluruh histori sebagai satu blob JSON per user —
-- supaya gampang di-query urut waktu, gampang hapus sebagian riwayat kalau
-- kepanjangan nanti, dan konsisten dengan pola chat_messages yang sudah ada.
create table if not exists ai_assistant_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) > 0 and char_length(content) <= 8000),
  created_at timestamptz not null default now()
);

create index if not exists ai_assistant_messages_user_created_idx
  on ai_assistant_messages (user_id, created_at);

alter table ai_assistant_messages enable row level security;

-- Murni percakapan PRIBADI — tidak ada moderasi/akses lintas-user sama
-- sekali di sini (beda dari chat_messages yang punya kebijakan moderasi
-- "akses penuh"), jadi cukup satu kebijakan per perintah: user cuma boleh
-- melihat/menulis/menghapus baris miliknya sendiri.
create policy ai_assistant_messages_select_own
  on ai_assistant_messages for select
  using (user_id = auth.uid());

create policy ai_assistant_messages_insert_own
  on ai_assistant_messages for insert
  with check (user_id = auth.uid());

-- Dipakai fitur "Hapus Percakapan" di UI — reset riwayat kalau kepanjangan
-- atau user mau mulai topik baru dari nol.
create policy ai_assistant_messages_delete_own
  on ai_assistant_messages for delete
  using (user_id = auth.uid());
