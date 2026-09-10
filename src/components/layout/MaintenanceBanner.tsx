"use client";

import { useState } from "react";
import { Wrench, X } from "lucide-react";

/**
 * Banner "sedang diperbarui" (Tahap 29) — dipasang di AppShell, tampil di
 * SEMUA halaman dashboard selama admin menyalakannya lewat
 * /dashboard/admin/status-sistem. Sengaja bisa ditutup (tombol X) supaya
 * tidak mengganggu kerja kalau perbaikannya makan waktu lama, tapi
 * ditutupnya cuma untuk sesi/halaman saat ini (state lokal, bukan
 * disimpan) — begitu pindah halaman atau muat ulang, muncul lagi selama
 * saklarnya masih menyala, jadi tidak lupa kalau masih dalam masa update.
 */
export function MaintenanceBanner({ message }: { message: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="relative flex items-center gap-3 overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 px-4 py-2.5 text-white">
      <span className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <Wrench className="h-4 w-4 shrink-0 animate-[wiggle_1.6s_ease-in-out_infinite]" />
      <p className="relative min-w-0 flex-1 truncate text-xs font-semibold sm:text-sm">{message}</p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Tutup pemberitahuan"
        className="relative shrink-0 rounded-full p-1 transition-colors hover:bg-white/20"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
