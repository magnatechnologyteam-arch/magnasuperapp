"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * Tombol submit login — permintaan Owner: beri efek animasi yang lebih
 * menarik saat proses login berjalan (bukan cuma tombol diam menunggu
 * redirect server action selesai). `useFormStatus()` cuma bisa dipakai di
 * Client Component TURUNAN `<form>` — makanya dipisah jadi komponen sendiri,
 * bukan langsung di LoginPage (Server Component).
 */
export function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#D4AF37] via-[#E5484D] to-[#0B7A63] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-wait disabled:opacity-90"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Memeriksa akun…
        </>
      ) : (
        "Masuk"
      )}
    </button>
  );
}
