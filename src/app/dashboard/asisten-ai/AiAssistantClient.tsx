"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AlertTriangle, Bot, Loader2, Send, Trash2 } from "lucide-react";
import { clearAiConversation, sendAiMessage, type AiMessage } from "@/lib/ai-assistant/actions";
import { cn } from "@/lib/cn";
import { GLASS_BORDER, GLASS_INPUT, GLASS_SURFACE } from "@/lib/glass";
import { formatTimeID, getInitials } from "@/lib/shared/utils";

const MAX_MESSAGE_LENGTH = 4000;

/**
 * Chat UI Asisten AI (Tahap 42) — SENGAJA jauh lebih sederhana dari
 * ChatClient.tsx (Chat tim): satu thread pribadi user<->AI, TANPA ruang
 * (rooms), TANPA @tag/mention, TANPA lampiran file, TANPA balas/edit/hapus
 * per-pesan (cuma "Hapus Percakapan" yang menghapus semuanya sekaligus).
 * TANPA polling juga — beda dari Chat tim yang perlu polling karena banyak
 * orang bisa menulis di ruang yang sama, di sini satu-satunya "orang lain"
 * di percakapan ini adalah balasan AI yang datang langsung dari hasil
 * `sendAiMessage()` sendiri, jadi state lokal cukup diperbarui langsung dari
 * hasil pemanggilan itu tanpa perlu menanyakan ulang ke server.
 */
export function AiAssistantClient({
  initialMessages,
  currentUserName,
}: {
  initialMessages: AiMessage[];
  currentUserName: string;
}) {
  const [messages, setMessages] = useState<AiMessage[]>(initialMessages);
  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  async function handleSend(e?: FormEvent) {
    e?.preventDefault();
    const text = composerText.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);
    // Optimistis: tampilkan pesan user segera (jangan tunggu balasan AI yang
    // bisa makan waktu beberapa detik) — komposer dikosongkan bersamaan
    // supaya terasa responsif, tapi kalau ternyata gagal (lihat di bawah)
    // pesan optimistis ini dicopot lagi dan teksnya dikembalikan ke komposer.
    const optimisticId = `pending-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, role: "user", content: text, createdAt: new Date().toISOString() },
    ]);
    setComposerText("");

    // PENTING: dibungkus try/catch — kalau tidak, pemanggilan Server Action
    // yang gagal di level TRANSPORT (bukan error terkendali yang dikembalikan
    // actions.ts sebagai {ok:false}), misalnya function di Vercel kena
    // batas waktu eksekusi lalu dimatikan paksa sebelum sempat membalas,
    // akan membuat `await` di bawah ini melempar exception. Tanpa try/catch,
    // `setSending(false)` di baris berikutnya tidak akan pernah kejalan —
    // tombol kirim & indikator "sedang mengetik" akan macet SELAMANYA,
    // persis gejala yang dilaporkan Owner (mengetik terus, pesan tidak
    // pernah muncul, tidak ada error apa pun ditampilkan).
    try {
      const result = await sendAiMessage(text);

      if (!result.ok) {
        setError(result.error);
        // Pesan user TETAP tersimpan di server oleh sendAiMessage (lihat
        // komentar di actions.ts) walau balasan AI gagal — cukup ganti versi
        // optimistis di sini dengan penanda "gagal", jangan copot & kembalikan
        // ke komposer (itu akan membuatnya seolah belum terkirim & memicu
        // pengiriman dobel kalau user kirim ulang).
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setComposerText(text);
        return;
      }

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticId),
        result.userMessage,
        result.assistantMessage,
      ]);
    } catch (err) {
      console.error("[ai-assistant] Pemanggilan Server Action gagal total:", err);
      setError(
        "Asisten AI tidak merespons (kemungkinan server terlalu lama membalas). Pesan Anda mungkin sudah tersimpan — coba refresh halaman, lalu kirim ulang kalau belum muncul."
      );
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setComposerText(text);
    } finally {
      setSending(false);
    }
  }

  async function handleClear() {
    if (clearing) return;
    setClearing(true);
    setError(null);
    const result = await clearAiConversation();
    setClearing(false);
    setClearConfirmOpen(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessages([]);
  }

  return (
    <div className={cn("flex h-full min-h-[520px] flex-col overflow-hidden rounded-2xl border", GLASS_SURFACE, GLASS_BORDER)}>
      <div className={cn("flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3", GLASS_BORDER)}>
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          <Bot className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          Percakapan pribadi Anda dengan Asisten AI
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setClearConfirmOpen((v) => !v)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-zinc-400 transition-colors hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
            aria-label="Hapus percakapan"
            title="Hapus percakapan"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {clearConfirmOpen && (
        <div className="flex shrink-0 flex-col gap-2 border-b border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Yakin hapus SELURUH percakapan ini? Tidak bisa dibatalkan.
          </span>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setClearConfirmOpen(false)}
              className="rounded-full px-3 py-1 font-semibold text-zinc-500 transition-colors hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/10"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void handleClear()}
              disabled={clearing}
              className="rounded-full bg-rose-600 px-3 py-1 font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {clearing ? "Menghapus…" : "Ya, Hapus Percakapan"}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                <Bot className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                Halo, {currentUserName.split(" ")[0]}!
              </p>
              <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
                Tanyakan apa saja — draf pesan, ringkasan, atau pertanyaan pekerjaan lainnya.
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <li key={msg.id} className={cn("flex items-end gap-2", isUser && "flex-row-reverse")}>
                  <div
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white",
                      isUser ? "bg-indigo-500" : "bg-gradient-to-br from-emerald-500 to-cyan-500"
                    )}
                    title={isUser ? currentUserName : "Asisten AI"}
                  >
                    {isUser ? getInitials(currentUserName) : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn("flex max-w-[80%] flex-col gap-1", isUser && "items-end")}>
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2 text-sm",
                        isUser
                          ? "rounded-br-sm bg-indigo-600 text-white"
                          : cn("rounded-bl-sm text-zinc-800 dark:text-zinc-100", GLASS_SURFACE)
                      )}
                    >
                      <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                    </div>
                    <span className="px-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                      {formatTimeID(msg.createdAt)}
                    </span>
                  </div>
                </li>
              );
            })}
            {sending && (
              <li className="flex items-end gap-2">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className={cn("flex items-center gap-1.5 rounded-2xl rounded-bl-sm px-3.5 py-2.5", GLASS_SURFACE)}>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400 dark:text-zinc-500" />
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">Asisten AI sedang mengetik…</span>
                </div>
              </li>
            )}
            <li ref={bottomRef} aria-hidden />
          </ul>
        )}
      </div>

      {error && (
        <p className="shrink-0 border-t border-black/5 px-4 py-2 text-xs font-medium text-rose-600 dark:border-white/10 dark:text-rose-300">
          {error}
        </p>
      )}

      <form onSubmit={handleSend} className={cn("shrink-0 border-t p-3", GLASS_BORDER)}>
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={composerText}
            onChange={(e) => setComposerText(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            onKeyDown={handleKeyDown}
            placeholder="Tulis pertanyaan Anda…"
            rows={1}
            disabled={sending}
            className={cn(
              "max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border px-3.5 py-2.5 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-emerald-400 disabled:opacity-60 dark:text-zinc-100",
              GLASS_INPUT
            )}
          />
          <button
            type="submit"
            disabled={sending || composerText.trim().length === 0}
            className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Kirim"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
