"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "./Modal";
import { cn } from "@/lib/cn";

/**
 * Dialog konfirmasi generik untuk aksi merusak (hapus, dsb).
 * Mode `blocked` dipakai saat aksi tidak boleh dilanjutkan (mis. alat masih
 * dipakai booking aktif) — hanya menampilkan pesan + tombol Tutup, tanpa
 * tombol konfirmasi, supaya pengguna tidak bisa "memaksa" aksi yang tidak aman.
 *
 * Tombol konfirmasi otomatis nonaktif sesaat setelah diklik (state
 * `submitting` di sini, bukan tanggung jawab tiap pemanggil) — mencegah klik
 * ganda yang cepat memicu aksi (mis. hapus) dua kali sebelum dialog sempat
 * tertutup, terutama di koneksi lambat. Direset otomatis begitu dialog
 * ditutup (`open` jadi false), jadi pemanggil tidak perlu berubah sama sekali.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  confirmVariant = "danger",
  blocked = false,
  blockedMessage,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" (default, merah) buat aksi merusak seperti hapus -- "primary"
   * (violet, warna BTN_PRIMARY di seluruh app) buat konfirmasi aksi maju
   * yang WAJAR/tidak merusak (setujui, tandai selesai, dsb) supaya tombolnya
   * tidak terasa seperti peringatan bahaya padahal cuma progres biasa. */
  confirmVariant?: "danger" | "primary";
  blocked?: boolean;
  blockedMessage?: ReactNode;
}) {
  const [submitting, setSubmitting] = useState(false);
  // Reset `submitting` begitu dialog ditutup -- disesuaikan LANGSUNG saat
  // render (pola resmi React "adjust state when a prop changes"), bukan
  // lewat useEffect seperti sebelumnya (dilarang linter react-hooks
  // versi terbaru, react-hooks/set-state-in-effect):
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setSubmitting(false);
  }

  function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    onConfirm?.();
  }

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      <div className="space-y-4">
        {blocked ? (
          <div className="rounded-lg bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            {blockedMessage}
          </div>
        ) : (
          description && (
            <div className="text-sm text-zinc-600 dark:text-zinc-300">{description}</div>
          )
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            {blocked ? "Tutup" : cancelLabel}
          </button>
          {!blocked && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                confirmVariant === "primary"
                  ? "bg-violet-600 hover:bg-violet-500"
                  : "bg-rose-600 hover:bg-rose-500"
              )}
            >
              {submitting ? "Memproses…" : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
