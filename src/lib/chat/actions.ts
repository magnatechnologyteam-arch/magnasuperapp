"use server";

import { redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUsers } from "@/lib/push/notify";
import { CHAT_ROOM_LABELS, isRoomAllowed, type ChatRoom } from "@/lib/chat/rooms";
import type { Division } from "@/lib/supabase/types";

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
  fileFormData?: FormData
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
    const res = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room", room)
      .gt("created_at", sinceIso)
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
