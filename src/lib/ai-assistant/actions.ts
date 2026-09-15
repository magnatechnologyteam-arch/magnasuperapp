"use server";

import { createClient, getCurrentProfile } from "@/lib/supabase/server";

/**
 * Asisten AI (Tahap 42) — permintaan Owner: chat pribadi user<->AI di dalam
 * aplikasi, dijalankan lewat 9Router (gateway AI self-hosted milik Magna
 * sendiri, endpoint gaya OpenAI: POST {base}/chat/completions). SENGAJA
 * terbuka untuk SEMUA divisi TERMASUK investor — beda dari fitur Chat tim
 * (src/lib/chat/actions.ts) yang mengecualikan investor.
 *
 * File ini WAJIB hanya berisi Server Action async (lihat komentar panjang
 * di src/lib/chat/rooms.ts soal bug build Vercel "Server Actions must be
 * async functions" kalau ada export sinkron ikut nyasar ke sini).
 */

const MAX_MESSAGE_LENGTH = 4000;
// Jumlah pesan riwayat (gabungan user+assistant) yang dikirim sebagai
// konteks ke model — dibatasi supaya payload/biaya token tidak membengkak
// tanpa batas seiring riwayat bertambah panjang. ~10 giliran tanya-jawab.
const HISTORY_CONTEXT_LIMIT = 20;
// Jaga-jaga kalau 9Router/tunnel/provider di baliknya macet — jangan sampai
// Server Action menggantung tanpa batas waktu.
const REQUEST_TIMEOUT_MS = 45_000;

const SYSTEM_PROMPT =
  "Anda adalah Asisten AI internal untuk staf Magna Technology (Magnarent, Magnativ, Production, Investor). " +
  "Bantu jawab pertanyaan, tulis draf teks, ringkas informasi, dan hal-hal produktivitas kerja lainnya. " +
  "Jawab singkat, jelas, dan langsung ke inti. Gunakan Bahasa Indonesia kecuali pengguna jelas menulis dalam bahasa lain.";

export type AiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type AiMessageRow = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

function mapRow(row: AiMessageRow): AiMessage {
  return {
    id: row.id,
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
    createdAt: row.created_at,
  };
}

/**
 * Tidak ada pembatasan divisi sama sekali di sini (beda dari
 * `requireChatAccess` di chat/actions.ts yang memblokir investor) — Asisten
 * AI ini SENGAJA terbuka untuk siapa pun yang sudah login, divisi apa pun.
 * Kalau belum login, `getCurrentProfile()` mengembalikan null — pada
 * praktiknya rute /dashboard/** sudah dijaga middleware, ini jaring
 * pengaman kalau Server Action dipanggil di luar jalur normal.
 */
async function requireAiAssistantAccess() {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error("Anda harus login untuk memakai Asisten AI.");
  }
  return profile;
}

export async function getAiMessages(): Promise<AiMessage[]> {
  const profile = await requireAiAssistantAccess();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ai_assistant_messages")
    .select("id, role, content, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[ai-assistant] getAiMessages gagal:", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapRow(row as AiMessageRow));
}

export type SendAiMessageResult =
  | { ok: true; userMessage: AiMessage; assistantMessage: AiMessage }
  | { ok: false; error: string };

/**
 * Alur: simpan pesan user dulu (supaya tidak hilang kalaupun panggilan ke
 * 9Router gagal), ambil sepotong riwayat terbaru sebagai konteks, panggil
 * endpoint OpenAI-compatible 9Router, lalu simpan balasannya.
 */
export async function sendAiMessage(rawMessage: string): Promise<SendAiMessageResult> {
  const profile = await requireAiAssistantAccess();
  const content = rawMessage.trim();

  if (!content) {
    return { ok: false, error: "Pesan tidak boleh kosong." };
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Pesan maksimal ${MAX_MESSAGE_LENGTH} karakter.` };
  }

  const baseUrl = process.env.AI_GATEWAY_BASE_URL;
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  const model = process.env.AI_GATEWAY_MODEL;

  // Dicek di awal (sebelum simpan pesan user) — kalau memang belum
  // dikonfigurasi, tidak ada gunanya menyimpan pesan yang pasti tidak akan
  // terbalas. Pesan error ini SENGAJA ditampilkan apa adanya ke pengguna
  // (bukan cuma di-log) karena ini murni masalah konfigurasi admin, bukan
  // kesalahan pengguna — supaya kalau ada yang lapor "AI-nya error", pesan
  // errornya sendiri sudah menjelaskan penyebabnya.
  if (!baseUrl || !apiKey || !model) {
    console.error("[ai-assistant] Env var AI_GATEWAY_* belum lengkap di Vercel.");
    return {
      ok: false,
      error: "Asisten AI belum dikonfigurasi (AI_GATEWAY_BASE_URL/AI_GATEWAY_API_KEY/AI_GATEWAY_MODEL belum diisi admin).",
    };
  }

  const supabase = await createClient();

  const { data: insertedUserRow, error: insertUserError } = await supabase
    .from("ai_assistant_messages")
    .insert({ user_id: profile.id, role: "user", content })
    .select("id, role, content, created_at")
    .single();

  if (insertUserError || !insertedUserRow) {
    console.error("[ai-assistant] Simpan pesan user gagal:", insertUserError?.message);
    return { ok: false, error: "Gagal mengirim pesan, coba lagi." };
  }

  const userMessage = mapRow(insertedUserRow as AiMessageRow);

  const { data: historyRows } = await supabase
    .from("ai_assistant_messages")
    .select("id, role, content, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(HISTORY_CONTEXT_LIMIT);

  const history = (historyRows ?? []).map((row) => mapRow(row as AiMessageRow)).reverse();

  const apiMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let replyContent: string;
  try {
    // `baseUrl` diisi admin lengkap sampai "/v1" (lihat instruksi env var) —
    // jadi tinggal ditambah path endpoint chat completion gaya OpenAI.
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages: apiMessages }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      console.error(`[ai-assistant] 9Router membalas status ${response.status}:`, bodyText.slice(0, 500));
      return {
        ok: false,
        error: `Asisten AI sedang bermasalah (status ${response.status}). Pesan Anda sudah tersimpan, coba kirim lagi sebentar lagi.`,
      };
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    replyContent = json.choices?.[0]?.message?.content?.trim() ?? "";

    if (!replyContent) {
      console.error("[ai-assistant] Respons 9Router tidak berisi teks balasan:", JSON.stringify(json).slice(0, 500));
      return { ok: false, error: "Asisten AI tidak memberi balasan. Coba kirim lagi." };
    }
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    console.error("[ai-assistant] Panggilan ke 9Router gagal:", err instanceof Error ? err.message : err);
    return {
      ok: false,
      error: isAbort
        ? "Asisten AI tidak merespons (timeout). Pesan Anda sudah tersimpan, coba lagi."
        : "Tidak bisa menghubungi Asisten AI — cek server 9Router sudah menyala dan tunnel aktif.",
    };
  } finally {
    clearTimeout(timeout);
  }

  const { data: insertedAssistantRow, error: insertAssistantError } = await supabase
    .from("ai_assistant_messages")
    .insert({ user_id: profile.id, role: "assistant", content: replyContent })
    .select("id, role, content, created_at")
    .single();

  if (insertAssistantError || !insertedAssistantRow) {
    console.error("[ai-assistant] Simpan balasan AI gagal:", insertAssistantError?.message);
    return { ok: false, error: "Balasan diterima tapi gagal disimpan, coba refresh halaman." };
  }

  return { ok: true, userMessage, assistantMessage: mapRow(insertedAssistantRow as AiMessageRow) };
}

export async function clearAiConversation(): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await requireAiAssistantAccess();
  const supabase = await createClient();

  const { error } = await supabase.from("ai_assistant_messages").delete().eq("user_id", profile.id);

  if (error) {
    console.error("[ai-assistant] clearAiConversation gagal:", error.message);
    return { ok: false, error: "Gagal menghapus percakapan, coba lagi." };
  }

  return { ok: true };
}
