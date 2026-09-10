"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  blocked?: boolean;
  blockedMessage?: ReactNode;
}) {
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) setSubmitting(false);
  }, [open]);

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
                "rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
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
