import type { Division } from "@/lib/supabase/types";

/**
 * Definisi ruang chat (Tahap 37) — SENGAJA dipisah dari actions.ts.
 *
 * Bug produksi yang ditemukan lewat build log Vercel: file `"use server"`
 * (actions.ts) di Next.js/Turbopack HANYA BOLEH meng-export fungsi async —
 * "Server Actions must be async functions". Konstanta biasa (`CHAT_ROOMS`,
 * `CHAT_ROOM_LABELS`) dan fungsi sinkron (`availableChatRooms`) yang tadinya
 * ikut di-export dari actions.ts bikin build gagal total (Turbopack build
 * failed). Nilai-nilai murni/helper sinkron seperti ini dipindah ke sini
 * (modul biasa, bebas diimpor server maupun client) supaya actions.ts
 * hanya berisi Server Action async sungguhan.
 */
export const CHAT_ROOMS = ["bersama", "magnarent", "magnative", "production"] as const;
export type ChatRoom = (typeof CHAT_ROOMS)[number];

export const CHAT_ROOM_LABELS: Record<ChatRoom, string> = {
  bersama: "Bersama",
  magnarent: "Magnarent",
  magnative: "Magnativ",
  production: "Production",
};

/**
 * Ruang chat yang boleh dilihat/ditulis satu divisi — "bersama" untuk
 * semua non-investor, ruang per-divisi cuma untuk divisi itu sendiri, dan
 * akses penuh ("all") boleh ikut SEMUA ruang (pola sama seperti
 * can_access_division() di modul lain). Dipakai baik di page.tsx (susun
 * tab ruang), ChatClient.tsx (tab ruang di klien), maupun actions.ts
 * (validasi server sebelum insert/select).
 */
export function availableChatRooms(division: Division): ChatRoom[] {
  if (division === "investor") return [];
  if (division === "all") return [...CHAT_ROOMS];
  if (division === "magnarent" || division === "magnative" || division === "production") {
    return ["bersama", division];
  }
  return ["bersama"];
}

export function isRoomAllowed(room: string, division: Division): room is ChatRoom {
  return (CHAT_ROOMS as readonly string[]).includes(room) && availableChatRooms(division).includes(room as ChatRoom);
}

/** Batas waktu edit/hapus pesan MILIK SENDIRI — 15 menit setelah terkirim
 * (Tahap 39, dikonfirmasi Owner), sama persis dengan `interval '15 minutes'`
 * di RLS `chat_messages_update_own` (migrasi 0040). Ditaruh di sini (bukan
 * actions.ts) supaya bisa diimpor DUA arah: oleh actions.ts (pesan error)
 * MAUPUN ChatClient.tsx (sembunyikan tombol edit/hapus di UI begitu lewat
 * jendela waktu ini) — actions.ts sendiri tidak boleh meng-export konstanta
 * biasa (lihat komentar panjang di atas soal "use server"). Akses penuh
 * ("all") TIDAK terkena batas ini untuk moderasi. */
export const EDIT_DELETE_WINDOW_MS = 15 * 60 * 1000;
