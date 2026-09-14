"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import {
  getChatMessages,
  searchTaggableUsers,
  sendChatMessage,
  type ChatMessage,
  type TaggableUser,
} from "@/lib/chat/actions";
import { CHAT_ROOM_LABELS, type ChatRoom } from "@/lib/chat/rooms";
import { DIVISION_BADGE_CLASSES, DIVISION_LABELS, type Division } from "@/lib/supabase/types";
import { cn } from "@/lib/cn";
import { formatTimeID, getAvatarColor, getInitials } from "@/lib/shared/utils";

const POLL_MS = 4000;
const MENTION_DEBOUNCE_MS = 200;

type CurrentUser = { id: string; username: string | null; fullName: string; division: Division };

type MentionState = { query: string; start: number };

/** Cari "@query" tepat di depan kursor pengetikan — dipakai untuk memicu
 * dropdown autocomplete @tag sambil mengetik. Wajib didahului awal teks
 * atau spasi (supaya alamat email dsb tidak ikut kepancing sebagai tag). */
function findMentionAtCursor(text: string, cursorPos: number): MentionState | null {
  const upToCursor = text.slice(0, cursorPos);
  const match = upToCursor.match(/(?:^|\s)@([a-z0-9._-]{0,20})$/i);
  if (!match) return null;
  const query = match[1];
  const start = upToCursor.length - query.length - 1;
  return { query, start };
}

/** Pecah body pesan jadi teks biasa + span highlight untuk tiap "@username" —
 * murni tampilan (highlight semua yang berpola @tag, tidak dicek ulang ke
 * daftar mentioned_user_ids — cukup untuk kebutuhan visual). */
function renderMessageBody(body: string) {
  const parts = body.split(/(@[a-z0-9._-]{3,20})/gi);
  return parts.map((part, i) =>
    /^@[a-z0-9._-]{3,20}$/i.test(part) ? (
      <span key={i} className="font-semibold text-indigo-600 dark:text-indigo-400">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function ChatClient({
  rooms,
  initialRoom,
  initialMessages,
  currentUser,
}: {
  rooms: ChatRoom[];
  initialRoom: ChatRoom;
  initialMessages: ChatMessage[];
  currentUser: CurrentUser;
}) {
  const router = useRouter();
  const [activeRoom, setActiveRoom] = useState<ChatRoom>(initialRoom);
  const [messagesByRoom, setMessagesByRoom] = useState<Partial<Record<ChatRoom, ChatMessage[]>>>({
    [initialRoom]: initialMessages,
  });
  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mention, setMention] = useState<MentionState | null>(null);
  const [suggestions, setSuggestions] = useState<TaggableUser[]>([]);
  const [isSearching, startSearchTransition] = useTransition();

  const cursorRef = useRef<Partial<Record<ChatRoom, string | null>>>({
    [initialRoom]: initialMessages.length > 0 ? initialMessages[initialMessages.length - 1].createdAt : null,
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Ditempel ke elemen <li> penanda "akhir daftar" (lihat JSX di bawah) —
  // tipe generic-nya WAJIB cocok elemen aslinya, bukan sembarang elemen,
  // supaya tidak jadi error tipe saat build production (`tsc` Vercel jauh
  // lebih ketat dari pengecekan sintaks esbuild di sandbox ini).
  const bottomRef = useRef<HTMLLIElement>(null);
  const mentionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messages = messagesByRoom[activeRoom] ?? [];

  // Muat pesan awal ruang yang BELUM pernah dibuka sejak halaman ini mount
  // (tab lain sudah dibawa dari server lewat `initialMessages`).
  useEffect(() => {
    if (messagesByRoom[activeRoom] !== undefined) return;
    let cancelled = false;
    (async () => {
      const { messages: fetched } = await getChatMessages(activeRoom, null);
      if (cancelled) return;
      cursorRef.current[activeRoom] = fetched.length > 0 ? fetched[fetched.length - 1].createdAt : null;
      setMessagesByRoom((prev) => ({ ...prev, [activeRoom]: fetched }));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom]);

  // Polling ringan (bukan Realtime, sesuai keputusan Owner) — cukup ambil
  // pesan yang lebih baru dari kursor terakhir tiap ruang yang sedang aktif.
  useEffect(() => {
    const interval = setInterval(async () => {
      const cursor = cursorRef.current[activeRoom] ?? null;
      const { messages: fresh } = await getChatMessages(activeRoom, cursor);
      if (fresh.length === 0) return;
      cursorRef.current[activeRoom] = fresh[fresh.length - 1].createdAt;
      setMessagesByRoom((prev) => ({ ...prev, [activeRoom]: [...(prev[activeRoom] ?? []), ...fresh] }));
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [activeRoom]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, activeRoom]);

  function handleRoomChange(room: ChatRoom) {
    if (room === activeRoom) return;
    setActiveRoom(room);
    setMention(null);
    setSuggestions([]);
    router.replace(`/dashboard/chat?room=${room}`, { scroll: false });
  }

  function updateMentionState(text: string, cursorPos: number) {
    const next = findMentionAtCursor(text, cursorPos);
    setMention(next);

    if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current);
    if (!next) {
      setSuggestions([]);
      return;
    }
    mentionDebounceRef.current = setTimeout(() => {
      startSearchTransition(async () => {
        const results = await searchTaggableUsers(next.query);
        setSuggestions(results);
      });
    }, MENTION_DEBOUNCE_MS);
  }

  function handleComposerChange(text: string) {
    setComposerText(text);
    updateMentionState(text, textareaRef.current?.selectionStart ?? text.length);
  }

  function applyMention(user: TaggableUser) {
    if (!mention) return;
    const before = composerText.slice(0, mention.start);
    const after = composerText.slice(mention.start + 1 + mention.query.length);
    const inserted = `@${user.username} `;
    const newText = `${before}${inserted}${after}`;
    setComposerText(newText);
    setMention(null);
    setSuggestions([]);

    requestAnimationFrame(() => {
      const pos = before.length + inserted.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape" && mention) {
      setMention(null);
      setSuggestions([]);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && suggestions.length === 0) {
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
    const result = await sendChatMessage(activeRoom, text);
    setSending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setComposerText("");
    cursorRef.current[activeRoom] = result.message.createdAt;
    setMessagesByRoom((prev) => ({ ...prev, [activeRoom]: [...(prev[activeRoom] ?? []), result.message] }));
  }

  return (
    <div className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-black/5 px-4 py-3 dark:border-white/10">
        {rooms.map((room) => (
          <button
            key={room}
            type="button"
            onClick={() => handleRoomChange(room)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              activeRoom === room
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
            )}
          >
            {CHAT_ROOM_LABELS[room]}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="grid h-full place-items-center text-center text-sm text-zinc-400 dark:text-zinc-500">
            Belum ada pesan di ruang ini. Mulai obrolan pertama!
          </p>
        ) : (
          <ul className="space-y-3">
            {messages.map((msg) => {
              const isOwn = msg.senderId === currentUser.id;
              return (
                <li key={msg.id} className={cn("flex items-end gap-2", isOwn && "flex-row-reverse")}>
                  <div
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white",
                      getAvatarColor(msg.senderName)
                    )}
                    title={msg.senderName}
                  >
                    {getInitials(msg.senderName)}
                  </div>
                  <div className={cn("flex max-w-[80%] flex-col gap-1", isOwn && "items-end")}>
                    {!isOwn && (
                      <div className="flex items-center gap-1.5 px-1">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                          {msg.senderName}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                            DIVISION_BADGE_CLASSES[msg.senderDivision]
                          )}
                        >
                          {DIVISION_LABELS[msg.senderDivision]}
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm",
                        isOwn
                          ? "rounded-br-sm bg-indigo-600 text-white"
                          : "rounded-bl-sm bg-zinc-100 text-zinc-800 dark:bg-white/10 dark:text-zinc-100"
                      )}
                    >
                      {renderMessageBody(msg.body)}
                    </div>
                    <span className="px-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                      {formatTimeID(msg.createdAt)}
                    </span>
                  </div>
                </li>
              );
            })}
            <li ref={bottomRef} aria-hidden />
          </ul>
        )}
      </div>

      {error && (
        <p className="shrink-0 border-t border-black/5 px-4 py-2 text-xs font-medium text-rose-600 dark:border-white/10 dark:text-rose-300">
          {error}
        </p>
      )}

      <form onSubmit={handleSend} className="relative shrink-0 border-t border-black/5 p-3 dark:border-white/10">
        {mention && (
          <div className="absolute bottom-full left-3 mb-2 w-64 overflow-hidden rounded-xl border border-black/5 bg-white shadow-lg shadow-black/10 dark:border-white/10 dark:bg-zinc-900">
            {isSearching && suggestions.length === 0 ? (
              <p className="flex items-center gap-2 px-3 py-2.5 text-xs text-zinc-400 dark:text-zinc-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Mencari…
              </p>
            ) : suggestions.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-zinc-400 dark:text-zinc-500">Tidak ada username cocok.</p>
            ) : (
              <ul className="max-h-52 overflow-y-auto p-1">
                {suggestions.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => applyMention(user)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-white/5"
                    >
                      <div
                        className={cn(
                          "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white",
                          getAvatarColor(user.fullName)
                        )}
                      >
                        {getInitials(user.fullName)}
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                          {user.fullName}
                        </span>
                        <span className="block truncate text-[11px] text-zinc-400 dark:text-zinc-500">
                          @{user.username}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={composerText}
            onChange={(e) => handleComposerChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onSelect={(e) => updateMentionState(composerText, e.currentTarget.selectionStart)}
            placeholder="Tulis pesan… ketik @ untuk menandai rekan kerja"
            rows={1}
            className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-black/10 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={sending || composerText.trim().length === 0}
            className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Kirim"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
