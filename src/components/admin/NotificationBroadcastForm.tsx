"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { broadcastNotification } from "@/lib/push/actions";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/cn";
import type { Division } from "@/lib/supabase/types";

const DIVISION_OPTIONS: { value: Division; label: string }[] = [
  { value: "magnarent", label: "Magnarent" },
  { value: "magnative", label: "Magnativ" },
  { value: "production", label: "Production" },
];

/**
 * Form "Kirim Notifikasi" (Tahap 32) — buat admin mengirim pengumuman
 * manual ke staf, terpisah dari notifikasi otomatis yang sudah terpasang
 * di tiap modul (booking baru, stok menipis, dst). Investor SENGAJA tidak
 * ditawarkan sebagai pilihan sama sekali (bukan cuma default tidak
 * tercentang) — lihat penjelasan di `broadcastNotification`.
 *
 * Catatan penting yang ditampilkan ke admin: fitur ini cuma mengirim ke
 * PERANGKAT yang sudah mengaktifkan "Aktifkan Notifikasi" di Pengaturan —
 * staf yang belum pernah menyalakannya tidak akan menerima apa pun lewat
 * jalur ini (perlu diaktifkan dulu dari perangkat masing-masing).
 */
export function NotificationBroadcastForm() {
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [divisions, setDivisions] = useState<Division[]>(["magnarent", "magnative", "production"]);
  const [isPending, setIsPending] = useState(false);

  function toggleDivision(d: Division) {
    setDivisions((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      showToast("Judul dan isi pesan wajib diisi.", "error");
      return;
    }
    if (divisions.length === 0) {
      showToast("Pilih minimal satu divisi tujuan.", "error");
      return;
    }

    setIsPending(true);
    const result = await broadcastNotification(divisions, { title: title.trim(), body: body.trim() });
    setIsPending(false);

    if (!result.ok) {
      showToast(result.message, "error");
      return;
    }
    showToast(result.message ?? "Notifikasi terkirim.");
    setTitle("");
    setBody("");
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <p className="text-sm font-bold text-zinc-900 dark:text-white">Kirim Notifikasi</p>
      <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
        Cuma sampai ke perangkat yang sudah mengaktifkan notifikasi lewat Pengaturan → Notifikasi. Investor tidak
        pernah ikut menerima broadcast dari sini.
      </p>

      <div className="mt-4">
        <label htmlFor="broadcast-title" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          Judul
        </label>
        <input
          id="broadcast-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="mis. Pengumuman Jadwal Libur"
          maxLength={80}
          className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-indigo-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
        />
      </div>

      <div className="mt-3">
        <label htmlFor="broadcast-body" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          Isi Pesan
        </label>
        <textarea
          id="broadcast-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Tulis pesan yang ingin disampaikan ke tim…"
          className="w-full resize-none rounded-xl border border-black/10 bg-transparent px-3.5 py-2 text-sm text-zinc-900 outline-none ring-indigo-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
        />
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">Kirim ke Divisi</p>
        <div className="flex flex-wrap gap-1.5">
          {DIVISION_OPTIONS.map((opt) => {
            const active = divisions.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleDivision(opt.value)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300"
                    : "border-black/10 text-zinc-500 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
          Akun akses penuh (Owner/Finance) otomatis ikut menerima, di luar pilihan di atas.
        </p>
      </div>

      <button
        type="button"
        onClick={handleSend}
        disabled={isPending}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Kirim Notifikasi
      </button>
    </div>
  );
}
