"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, MessageSquare, RotateCcw, Send, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { getAssetComments, addAssetComment, setAssetCommentResolved, deleteAssetComment } from "@/lib/magnative/actions";
import type { AssetComment, CreativeAsset } from "@/lib/magnative/types";

/**
 * Modal komentar/anotasi per aset kreatif ("proofing ringan", Update
 * Opsional 2 — hasil gap analysis vs aplikasi kreatif luar seperti
 * Wrike/Productive yang punya fitur komentar/markup langsung di atas
 * file). BEDA dari modal lain di modul ini: komentar di-fetch on-demand
 * lewat `getAssetComments` (bukan dari MagnativeDataProvider) supaya
 * provider tidak perlu memuat komentar SEMUA aset sekaligus — lihat
 * komentar di actions.ts.
 */
export function AssetCommentModal({ asset, onClose }: { asset: CreativeAsset; onClose: () => void }) {
  const { showToast } = useToast();
  const [comments, setComments] = useState<AssetComment[] | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAssetComments(asset.id).then((rows) => {
      if (!cancelled) setComments(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [asset.id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);
    const result = await addAssetComment(asset.id, text);
    setSubmitting(false);

    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setText("");
    setComments(await getAssetComments(asset.id));
  }

  async function handleToggleResolved(id: string, current: boolean) {
    setBusyId(id);
    const result = await setAssetCommentResolved(id, !current);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setComments(await getAssetComments(asset.id));
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    const result = await deleteAssetComment(id);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setComments((prev) => prev?.filter((c) => c.id !== id) ?? null);
  }

  return (
    <Modal open onClose={onClose} title={`Komentar — ${asset.title}`}>
      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="asset-comment-text" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Tambah catatan revisi
            </label>
            <textarea
              id="asset-comment-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder="mis. Warna logo kurang kontras, tolong dicerahkan"
              className="w-full resize-none rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            title="Kirim komentar"
            aria-label="Kirim komentar"
            className="rounded-full p-2.5 text-white shadow-sm disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)" }}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        <div className="max-h-80 overflow-y-auto rounded-xl border border-black/5 dark:border-white/10">
          {comments === null ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-400">Memuat komentar…</p>
          ) : comments.length === 0 ? (
            <EmptyState icon={MessageSquare} title="Belum ada komentar" description="Jadi yang pertama kasih catatan di aset ini." />
          ) : (
            <ul className="divide-y divide-black/5 dark:divide-white/5">
              {comments.map((c) => (
                <li key={c.id} className={cn("px-4 py-3", c.isResolved && "opacity-60")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-white">{c.authorName}</p>
                      <p className={cn("mt-0.5 text-sm text-zinc-700 dark:text-zinc-300", c.isResolved && "line-through")}>
                        {c.commentText}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleResolved(c.id, c.isResolved)}
                        disabled={busyId === c.id}
                        title={c.isResolved ? "Tandai belum selesai" : "Tandai selesai"}
                        aria-label={c.isResolved ? "Tandai belum selesai" : "Tandai selesai"}
                        className={cn(
                          "rounded-full p-1.5 transition-colors",
                          c.isResolved
                            ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                            : "text-zinc-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                        )}
                      >
                        {c.isResolved ? <RotateCcw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        disabled={busyId === c.id}
                        title="Hapus komentar"
                        aria-label="Hapus komentar"
                        className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
