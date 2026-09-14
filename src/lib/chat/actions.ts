"use server";

import { redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUsers } from "@/lib/push/notify";
import { CHAT_ROOM_LABELS, isRoomAllowed, type ChatRoom } from "@/lib/chat/rooms";
import type { Division } from "@/lib/supabase/types";

// Batas waktu edit/hapus 15 menit (Tahap 39) TIDAK dicek manual di sini —
// cukup ditegakkan lewat RLS `chat_messages_update_own` (migrasi 0040) dan
// dideteksi lewat "0 baris ter-update" di editChatMessage/deleteChatMessage
// di bawah. Konstanta `EDIT_DELETE_WINDOW_MS` (nilai sama, 15 menit) hidup
// di @/lib/chat/rooms — dipakai ChatClient.tsx untuk sembunyikan tombol
// edit/hapus di UI begitu lewat jendela waktunya.

/**
 * Fitur Chat (Tahap 37) — permintaan Owner: chat untuk keseluruhan KECUALI
 * investor, dengan @tag username yang otomatis kirim push notification ke
 * orang yang di-tag. Struktur ruang (kombinasi "bersama" + per-divisi) dan
 * mekanisme update (polling ringan, bukan Realtime) sudah dikonfirmasi
 * langsung oleh Owner sebelumnya.
 *
 * File ini WAJIB hanya berisi Server Action async — lihat komentar panjang
 * di rooms.ts soal bug build Vercel yang ditemukan gara-gara ini
 * (konstanta ruang & helper sinkron sudah dipindah ke sana).
 */

/** Username 3-20 karakter huruf kecil/angka/titik/garis bawah/strip — sama
 * persis dengan USERNAME_PATTERN di admin/actions.ts, dipakai di sini untuk
 * MENGENALI pola "@username" di dalam teks pesan (bukan validasi username
 * baru), jadi ditulis sebagai regex global (tanpa jangkar ^/$). */
const MENTION_PATTERN = /@([a-z0-9._-]{3,20})/gi;
const MAX_BODY_LENGTH = 2000;

// Lampiran chat (Tahap 38) — scope tipe file sudah dikonfirmasi Owner: "Foto
// + dokumen umum". Batas 10MB/file dipilih sendiri (belum ada permintaan
// spesifik Owner soal ukuran) — cukup longgar untuk foto kamera HP modern
// tanpa bikin bucket Storage membengkak cepat.
const ATTACHMENT_BUCKET = "chat-attachments";
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export type ChatAttachment = {
  url: string;
  name: string;
  type: string;
  size: number;
};

export type ChatReplySnapshot = {
  senderName: string;
  body: string;
  attachmentName: string | null;
};

export type ChatMessage = {
  id: string;
  room: ChatRoom;
  senderId: string;
  senderName: string;
  senderUsername: string | null;
  senderDivision: Division;
  body: string;
  mentionedUserIds: string[];
  attachment: ChatAttachment | null;
  replyTo: ChatReplySnapshot | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
};

type ChatMessageRow = {
  id: string;
  room: string;
  sender_id: string;
  sender_name: string;
  sender_username: string | null;
  sender_division: string;
  body: string;
  mentioned_user_ids: string[] | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  reply_to_sender_name: string | null;
  reply_to_body: string | null;
  reply_to_attachment_name: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

function mapRow(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    room: row.room as ChatRoom,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderUsername: row.sender_username,
    senderDivision: row.sender_division as Division,
    body: row.body,
    mentionedUserIds: row.mentioned_user_ids ?? [],
    attachment:
      row.attachment_url && row.attachment_name && row.attachment_type && row.attachment_size != null
        ? { url: row.attachment_url, name: row.attachment_name, type: row.attachment_type, size: row.attachment_size }
        : null,
    replyTo:
      row.reply_to_sender_name != null
        ? { senderName: row.reply_to_sender_name, body: row.reply_to_body ?? "", attachmentName: row.reply_to_attachment_name }
        : null,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
  };
}

/**
 * Sama seperti `requireFullAccess` di admin/actions.ts, tapi untuk chat:
 * satu-satunya yang diblokir total di sini adalah investor. RLS di
 * migrasi 0038 sudah menegakkan ini juga di level database — pengecekan di
 * sini murni supaya investor langsung di-redirect (bukan melihat halaman
 * chat kosong) kalau nekat buka URL-nya langsung.
 */
export async function requireChatAccess() {
  const profile = await getCurrentProfile();
  if (!profile || profile.division === "investor") {
    redirect("/dashboard");
  }
  return profile;
}

/** Ambil daftar `@username` unik dari sebuah pesan, huruf kecil semua. */
function extractMentionedUsernames(body: string): string[] {
  const matches = body.matchAll(MENTION_PATTERN);
  const usernames = new Set<string>();
  for (const m of matches) usernames.add(m[1].toLowerCase());
  return Array.from(usernames);
}

export type SendChatMessageResult = { ok: true; message: ChatMessage } | { ok: false; error: string };

export async function sendChatMessage(
  room: ChatRoom,
  rawBody: string,
  fileFormData?: FormData,
  replyToId?: string | null
): Promise<SendChatMessageResult> {
  const profile = await requireChatAccess();

  if (!isRoomAllowed(room, profile.division)) {
    return { ok: false, error: "Ruang chat tidak valid." };
  }

  const body = rawBody.trim();
  const file = fileFormData?.get("file");
  const hasFile = file instanceof File && file.size > 0;

  // Body boleh kosong HANYA kalau ada lampiran (mis. kirim foto tanpa
  // keterangan) — sama seperti constraint chat_messages_body_check di
  // migrasi 0039.
  if (!body && !hasFile) {
    return { ok: false, error: "Pesan tidak boleh kosong." };
  }
  if (body.length > MAX_BODY_LENGTH) {
    return { ok: false, error: `Pesan maksimal ${MAX_BODY_LENGTH} karakter.` };
  }

  if (hasFile && file.size > MAX_ATTACHMENT_BYTES) {
    return { ok: false, error: "Ukuran file maksimal 10MB." };
  }
  if (hasFile && !ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    return { ok: false, error: "Tipe file tidak didukung. Gunakan foto (JPG/PNG/WebP) atau dokumen (PDF/Word/Excel)." };
  }

  // Cari @username yang disebut di pesan lalu cocokkan ke tabel profiles —
  // pakai admin client karena RLS profiles (migrasi 0003) membatasi tiap
  // orang cuma lihat profilnya sendiri, jadi tidak bisa cari username orang
  // lain lewat client biasa. Investor sengaja DIKECUALIKAN dari hasil
  // pencocokan — dia tidak pernah ikut chat, jadi tidak relevan/tidak akan
  // pernah menerima notifikasi tag di sini.
  const mentionedUsernames = extractMentionedUsernames(body);
  let mentionedUserIds: string[] = [];

  if (mentionedUsernames.length > 0) {
    const admin = createAdminClient();
    const { data: mentioned, error: mentionError } = await admin
      .from("profiles")
      .select("id, username")
      .neq("division", "investor")
      .in("username", mentionedUsernames);

    if (mentionError) {
      console.error("[chat] Pencocokan @tag gagal:", mentionError.message);
    } else {
      mentionedUserIds = (mentioned ?? [])
        .map((p) => p.id as string)
        .filter((id) => id !== profile.id); // tag diri sendiri tidak perlu notifikasi
    }
  }

  const supabase = await createClient();

  // Snapshot balasan (reply) — DIREKAM SEKARANG, bukan di-JOIN saat tampil,
  // supaya kutipannya tidak ikut berubah kalau pesan asli belakangan
  // diedit/dihapus (lihat komentar panjang di migrasi 0040). Kalau pesan yang
  // dibalas ternyata sudah tidak ada/sudah dihapus/beda ruang (mis. race
  // klik "Balas" lalu pesannya keburu dihapus orang lain), balasan diam-diam
  // dikirim TANPA kutipan alih-alih menggagalkan seluruh pengiriman.
  let replySnapshot: ChatReplySnapshot | null = null;
  if (replyToId) {
    const { data: original } = await supabase
      .from("chat_messages")
      .select("sender_name, body, attachment_name, deleted_at, room")
      .eq("id", replyToId)
      .maybeSingle();

    if (original && !original.deleted_at && original.room === room) {
      replySnapshot = {
        senderName: original.sender_name,
        body: original.body,
        attachmentName: original.attachment_name,
      };
    }
  }

  // Upload dulu (kalau ada lampiran), baru insert baris pesan — sama seperti
  // pola bukti pembayaran di src/lib/capital-requests/actions.ts. Kalau
  // insert-nya gagal setelah upload berhasil, file yang sudah terlanjur
  // ter-upload dibersihkan lagi (lihat blok cleanup di bawah) supaya tidak
  // jadi file yatim menumpuk di bucket.
  let attachmentUrl: string | null = null;
  let attachmentPath: string | null = null;
  let attachmentName: string | null = null;
  let attachmentType: string | null = null;
  let attachmentSize: number | null = null;

  if (hasFile) {
    const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "bin";
    const storagePath = `${room}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .upload(storagePath, file, { contentType: file.type || undefined });

    if (uploadError) {
      console.error("[chat] Upload lampiran gagal:", uploadError.message);
      return { ok: false, error: "Gagal mengunggah lampiran, coba lagi." };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(ATTACHMENT_BUCKET).getPublicUrl(storagePath);

    attachmentUrl = publicUrl;
    attachmentPath = storagePath;
    attachmentName = file.name;
    attachmentType = file.type;
    attachmentSize = file.size;
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      room,
      sender_id: profile.id,
      sender_name: profile.full_name || profile.username || "Pengguna",
      sender_username: profile.username,
      sender_division: profile.division,
      body,
      mentioned_user_ids: mentionedUserIds,
      attachment_url: attachmentUrl,
      attachment_path: attachmentPath,
      attachment_name: attachmentName,
      attachment_type: attachmentType,
      attachment_size: attachmentSize,
      reply_to_id: replySnapshot ? replyToId : null,
      reply_to_sender_name: replySnapshot?.senderName ?? null,
      reply_to_body: replySnapshot?.body ?? null,
      reply_to_attachment_name: replySnapshot?.attachmentName ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[chat] sendChatMessage gagal:", error?.message);
    if (attachmentPath) {
      await supabase.storage.from(ATTACHMENT_BUCKET).remove([attachmentPath]);
    }
    return { ok: false, error: "Gagal mengirim pesan, coba lagi." };
  }

  if (mentionedUserIds.length > 0) {
    const roomLabel = CHAT_ROOM_LABELS[room];
    // Pesan lampiran-saja (body kosong) tidak punya teks untuk dicuplik di
    // notifikasi — tampilkan keterangan generik supaya notifikasinya tetap
    // masuk akal alih-alih kosong melompong.
    const notifyBody = body
      ? body.length > 120
        ? `${body.slice(0, 117)}...`
        : body
      : `📎 Mengirim lampiran: ${attachmentName}`;
    void notifyUsers(
      mentionedUserIds,
      {
        title: `${profile.full_name} menyebut Anda di chat ${roomLabel}`,
        body: notifyBody,
        url: `/dashboard/chat?room=${room}`,
      },
      profile.id
    );
  }

  return { ok: true, message: mapRow(data as ChatMessageRow) };
}

/**
 * Dipanggil berulang oleh klien (polling ringan, bukan Realtime — sudah
 * dikonfirmasi Owner) untuk mengambil pesan baru di satu ruang.
 *
 * - `sinceIso` kosong/null → ambil 50 pesan TERAKHIR (muat awal buka ruang).
 * - `sinceIso` terisi → ambil pesan yang lebih baru dari itu saja (dipanggil
 *   tiap beberapa detik sekali supaya tidak menarik ulang seluruh riwayat).
 */
export async function getChatMessages(room: ChatRoom, sinceIso?: string | null): Promise<{ messages: ChatMessage[] }> {
  const profile = await requireChatAccess();

  if (!isRoomAllowed(room, profile.division)) {
    return { messages: [] };
  }

  const supabase = await createClient();
  let data: ChatMessageRow[] | null = null;
  let error: { message: string } | null = null;

  if (sinceIso) {
    // Tahap 39: BUKAN CUMA pesan baru — juga tangkap pesan LAMA yang baru
    // saja diedit/dihapus setelah cursor ini. Kalau cuma `created_at >
    // cursor` (kondisi lama, sebelum ada edit/hapus), sebuah pesan LAMA yang
    // diedit/dihapus ORANG LAIN tidak akan pernah ke-poll ulang (created_at
    // baris itu kan tidak berubah) — perubahannya tidak akan pernah sampai
    // ke tab orang lain yang chat-nya sedang terbuka tanpa reload manual.
    const res = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room", room)
      .or(`created_at.gt.${sinceIso},edited_at.gt.${sinceIso},deleted_at.gt.${sinceIso}`)
      .order("created_at", { ascending: true })
      .limit(200);
    data = res.data as ChatMessageRow[] | null;
    error = res.error;
  } else {
    const res = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room", room)
      .order("created_at", { ascending: false })
      .limit(50);
    data = (res.data as ChatMessageRow[] | null)?.slice().reverse() ?? null;
    error = res.error;
  }

  if (error) {
    console.error("[chat] getChatMessages gagal:", error.message);
    return { messages: [] };
  }

  return { messages: (data ?? []).map(mapRow) };
}

export type TaggableUser = { id: string; username: string; fullName: string; division: Division };

/**
 * Autocomplete @tag di kotak ketik chat — pakai admin client dengan alasan
 * sama seperti pencocokan mention di `sendChatMessage`: RLS profiles tidak
 * mengizinkan pencarian lintas pengguna lewat client biasa.
 */
export async function searchTaggableUsers(query: string): Promise<TaggableUser[]> {
  const profile = await requireChatAccess();

  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, username, full_name, division")
    .neq("division", "investor")
    .not("username", "is", null)
    .ilike("username", `${trimmed}%`)
    .order("username")
    .limit(8);

  if (error) {
    console.error("[chat] searchTaggableUsers gagal:", error.message);
    return [];
  }

  return (data ?? [])
    .filter((p) => p.id !== profile.id && p.username)
    .map((p) => ({
      id: p.id as string,
      username: p.username as string,
      fullName: (p.full_name as string) || (p.username as string),
      division: p.division as Division,
    }));
}

/**
 * Edit teks pesan sendiri — dibatasi 15 menit setelah terkirim, ditegakkan
 * DUA LAPIS: di sini (supaya pesan errornya jelas) dan di RLS
 * `chat_messages_update_own` (migrasi 0040, backstop kalau ada yang lewat
 * jalur lain). Kalau UPDATE tidak mengenai baris manapun (RLS menolak —
 * bukan pemilik, atau sudah lewat 15 menit), PostgREST TIDAK melempar error,
 * cuma mengembalikan 0 baris — makanya dicek lewat `.select()` + panjang
 * array, bukan cuma field `error`.
 */
export async function editChatMessage(id: string, rawBody: string): Promise<SendChatMessageResult> {
  await requireChatAccess();
  const body = rawBody.trim();

  if (body.length > MAX_BODY_LENGTH) {
    return { ok: false, error: `Pesan maksimal ${MAX_BODY_LENGTH} karakter.` };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("chat_messages")
    .select("attachment_url, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Pesan tidak ditemukan." };
  if (existing.deleted_at) return { ok: false, error: "Pesan ini sudah dihapus." };
  if (!body && !existing.attachment_url) {
    return { ok: false, error: "Pesan tidak boleh kosong." };
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .update({ body, edited_at: new Date().toISOString() })
    .eq("id", id)
    .select("*");

  if (error) {
    console.error("[chat] editChatMessage gagal:", error.message);
    return { ok: false, error: "Gagal mengedit pesan, coba lagi." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Pesan ini sudah tidak bisa diedit (lewat 15 menit atau bukan milik Anda)." };
  }

  return { ok: true, message: mapRow(data[0] as ChatMessageRow) };
}

/**
 * Hapus pesan (soft-delete — lihat komentar panjang di migrasi 0040 kenapa
 * bukan DELETE baris sungguhan). Dua jalur yang sah-sah saja lewat sini:
 * pengirim sendiri (dibatasi 15 menit, RLS `chat_messages_update_own`) ATAU
 * akses penuh untuk moderasi (tanpa batas waktu, RLS
 * `chat_messages_update_moderation`) — server action ini tidak perlu
 * membedakan keduanya secara eksplisit, cukup coba UPDATE-nya dan biarkan
 * RLS yang memutuskan sah/tidak (sama pola deteksi 0-baris seperti
 * `editChatMessage`).
 */
export async function deleteChatMessage(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await requireChatAccess();

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("chat_messages")
    .select("attachment_path")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Pesan tidak ditemukan." };

  const { data, error } = await supabase
    .from("chat_messages")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: profile.id,
      body: "",
      attachment_url: null,
      attachment_path: null,
      attachment_name: null,
      attachment_type: null,
      attachment_size: null,
    })
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[chat] deleteChatMessage gagal:", error.message);
    return { ok: false, error: "Gagal menghapus pesan, coba lagi." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Pesan ini sudah tidak bisa dihapus (lewat 15 menit atau bukan milik Anda)." };
  }

  // Bersihkan file lampiran dari Storage kalau ada — pakai ADMIN client
  // (bukan client biasa) karena kebijakan `chat_attachments_delete` (migrasi
  // 0039) cuma izinkan `owner = auth.uid()` menghapus filenya SENDIRI,
  // padahal ini bisa saja moderasi akses penuh menghapus lampiran milik
  // ORANG LAIN — client biasa akan ditolak RLS Storage-nya.
  if (existing.attachment_path) {
    const admin = createAdminClient();
    const { error: removeError } = await admin.storage.from(ATTACHMENT_BUCKET).remove([existing.attachment_path]);
    if (removeError) {
      console.error("[chat] Hapus file lampiran gagal (baris pesan tetap terhapus):", removeError.message);
    }
  }

  return { ok: true };
}

/**
 * "Hapus Seluruh Chat" — bersihkan TOTAL riwayat satu ruang, khusus akses
 * penuh (dikonfirmasi Owner). Beda dengan `deleteChatMessage` di atas: ini
 * DELETE baris sungguhan (bukan soft-delete), sesuai RLS
 * `chat_messages_delete_full_access` (migrasi 0040) yang memang cuma
 * mengizinkan `division = 'all'`.
 */
export async function clearChatRoom(room: ChatRoom): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await requireChatAccess();

  if (profile.division !== "all") {
    return { ok: false, error: "Hanya akses penuh yang bisa menghapus seluruh chat." };
  }
  if (!isRoomAllowed(room, profile.division)) {
    return { ok: false, error: "Ruang chat tidak valid." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("chat_messages").delete().eq("room", room).select("attachment_path");

  if (error) {
    console.error("[chat] clearChatRoom gagal:", error.message);
    return { ok: false, error: "Gagal menghapus seluruh chat, coba lagi." };
  }

  const paths = (data ?? []).map((r) => r.attachment_path as string | null).filter((p): p is string => !!p);
  if (paths.length > 0) {
    const admin = createAdminClient();
    const { error: removeError } = await admin.storage.from(ATTACHMENT_BUCKET).remove(paths);
    if (removeError) {
      console.error("[chat] Hapus lampiran saat clearChatRoom gagal (pesan tetap terhapus):", removeError.message);
    }
  }

  return { ok: true };
}
