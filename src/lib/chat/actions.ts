"use server";

import { redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUsers } from "@/lib/push/notify";
import type { Division } from "@/lib/supabase/types";

/**
 * Fitur Chat (Tahap 37) — permintaan Owner: chat untuk keseluruhan KECUALI
 * investor, dengan @tag username yang otomatis kirim push notification ke
 * orang yang di-tag. Struktur ruang (kombinasi "bersama" + per-divisi) dan
 * mekanisme update (polling ringan, bukan Realtime) sudah dikonfirmasi
 * langsung oleh Owner sebelumnya.
 */
export const CHAT_ROOMS = ["bersama", "magnarent", "magnative", "production"] as const;
export type ChatRoom = (typeof CHAT_ROOMS)[number];

export const CHAT_ROOM_LABELS: Record<ChatRoom, string> = {
  bersama: "Bersama",
  magnarent: "Magnarent",
  magnative: "Magnativ",
  production: "Production",
};

/** Username 3-20 karakter huruf kecil/angka/titik/garis bawah/strip — sama
 * persis dengan USERNAME_PATTERN di admin/actions.ts, dipakai di sini untuk
 * MENGENALI pola "@username" di dalam teks pesan (bukan validasi username
 * baru), jadi ditulis sebagai regex global (tanpa jangkar ^/$). */
const MENTION_PATTERN = /@([a-z0-9._-]{3,20})/gi;
const MAX_BODY_LENGTH = 2000;

export type ChatMessage = {
  id: string;
  room: ChatRoom;
  senderId: string;
  senderName: string;
  senderUsername: string | null;
  senderDivision: Division;
  body: string;
  mentionedUserIds: string[];
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
    createdAt: row.created_at,
  };
}

/**
 * Ruang chat yang boleh dilihat/ditulis satu divisi — "bersama" untuk
 * semua non-investor, ruang per-divisi cuma untuk divisi itu sendiri, dan
 * akses penuh ("all") boleh ikut SEMUA ruang (pola sama seperti
 * can_access_division() di modul lain). Dipakai baik di page.tsx (susun
 * tab ruang) maupun di sini (validasi server sebelum insert/select).
 */
export function availableChatRooms(division: Division): ChatRoom[] {
  if (division === "investor") return [];
  if (division === "all") return [...CHAT_ROOMS];
  if (division === "magnarent" || division === "magnative" || division === "production") {
    return ["bersama", division];
  }
  return ["bersama"];
}

function isRoomAllowed(room: string, division: Division): room is ChatRoom {
  return (CHAT_ROOMS as readonly string[]).includes(room) && availableChatRooms(division).includes(room as ChatRoom);
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

export async function sendChatMessage(room: ChatRoom, rawBody: string): Promise<SendChatMessageResult> {
  const profile = await requireChatAccess();

  if (!isRoomAllowed(room, profile.division)) {
    return { ok: false, error: "Ruang chat tidak valid." };
  }

  const body = rawBody.trim();
  if (!body) {
    return { ok: false, error: "Pesan tidak boleh kosong." };
  }
  if (body.length > MAX_BODY_LENGTH) {
    return { ok: false, error: `Pesan maksimal ${MAX_BODY_LENGTH} karakter.` };
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
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[chat] sendChatMessage gagal:", error?.message);
    return { ok: false, error: "Gagal mengirim pesan, coba lagi." };
  }

  if (mentionedUserIds.length > 0) {
    const roomLabel = CHAT_ROOM_LABELS[room];
    void notifyUsers(
      mentionedUserIds,
      {
        title: `${profile.full_name} menyebut Anda di chat ${roomLabel}`,
        body: body.length > 120 ? `${body.slice(0, 117)}...` : body,
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
