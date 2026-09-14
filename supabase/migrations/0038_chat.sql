-- Fitur Chat (Tahap 37) — permintaan Owner: "form chat untuk keseluruhan
-- kecuali investor yang bisa tag username dan itu akan otomatis mengirim
-- notifikasi yang di-tag tersebut serta bisa chat langsung disitu".
--
-- Struktur ruang chat, sesuai keputusan yang sudah dikonfirmasi Owner lewat
-- pertanyaan sebelumnya (kombinasi keduanya): SATU ruang "bersama" untuk
-- semua orang (3 divisi operasional + akses penuh) DITAMBAH ruang terpisah
-- per divisi (magnarent/magnative/production) — investor TIDAK ikut ruang
-- mana pun. Update pesan baru dilakukan lewat POLLING ringan dari klien
-- (bukan Supabase Realtime) — juga sudah dikonfirmasi Owner, supaya tidak
-- perlu koneksi websocket tambahan/biaya Realtime.
--
-- Kolom sender_name/sender_username/sender_division SENGAJA didenormalisasi
-- persis seperti actor_name di activity_log (migrasi 0008) — RLS `profiles`
-- (migrasi 0003) membatasi tiap orang cuma lihat profilnya SENDIRI, jadi
-- kalau chat cuma menyimpan sender_id, klien tidak akan pernah bisa
-- menampilkan nama pengirim pesan ORANG LAIN di ruang chat sama sekali.

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room text not null,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  sender_username text,
  sender_division text not null,
  body text not null,
  -- Daftar id pengguna yang di-@tag di pesan ini — dipakai server (bukan
  -- RLS) untuk memutuskan siapa yang dikirimi push notification saat pesan
  -- ini dibuat (lihat sendChatMessage di src/lib/chat/actions.ts).
  mentioned_user_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint chat_messages_room_check check (room in ('bersama', 'magnarent', 'magnative', 'production')),
  constraint chat_messages_body_check check (char_length(btrim(body)) > 0 and char_length(body) <= 2000)
);

-- Dipakai polling (ambil pesan terbaru per ruang, urut waktu) — lihat
-- getChatMessages di src/lib/chat/actions.ts.
create index if not exists chat_messages_room_created_at_idx
  on public.chat_messages (room, created_at);

alter table public.chat_messages enable row level security;

-- Investor TIDAK PERNAH ikut chat sama sekali (permintaan eksplisit Owner:
-- "chat untuk keseluruhan KECUALI investor"). Untuk yang lain: ruang
-- "bersama" selalu boleh, ruang per-divisi hanya boleh untuk divisi itu
-- sendiri, dan akses penuh ('all') boleh lihat/tulis di SEMUA ruang (sama
-- seperti pola can_access_division() di modul-modul lain).
drop policy if exists "chat_messages_select" on public.chat_messages;
create policy "chat_messages_select"
  on public.chat_messages for select
  to authenticated
  using (
    public.current_user_division() <> 'investor'
    and (
      room = 'bersama'
      or room = public.current_user_division()
      or public.current_user_division() = 'all'
    )
  );

-- Insert lewat client biasa (bukan admin) supaya `sender_id = auth.uid()`
-- tervalidasi RLS langsung — mencegah pengguna mengaku sebagai orang lain
-- lewat body request yang dimanipulasi.
drop policy if exists "chat_messages_insert" on public.chat_messages;
create policy "chat_messages_insert"
  on public.chat_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.current_user_division() <> 'investor'
    and (
      room = 'bersama'
      or room = public.current_user_division()
      or public.current_user_division() = 'all'
    )
  );

-- Sengaja TIDAK ADA policy update/delete — pesan chat bersifat permanen
-- (log percakapan), sama seperti activity_log yang juga tidak bisa diedit
-- oleh pengguna biasa. Kalau suatu saat perlu moderasi (hapus pesan
-- bermasalah), tambahkan policy delete khusus akses penuh di migrasi baru.
