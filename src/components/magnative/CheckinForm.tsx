"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitCheckin } from "@/lib/magnative/actions";

/**
 * Form check-in publik (rekomendasi Bagian 5-B #10, migrasi 0068) --
 * dibuka lewat scan QR yang dicetak/ditampilkan staf di venue. Nama tamu
 * OPSIONAL (tamu boleh langsung submit tanpa isi apa-apa demi kecepatan
 * antrean check-in saat event ramai).
 */
export function CheckinForm({ token }: { token: string }) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await submitCheckin(token, name);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <p className="text-lg font-semibold text-slate-900">Check-in berhasil!</p>
        <p className="text-sm text-slate-500">Terima kasih sudah hadir. Selamat menikmati acaranya.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="guest-name" className="mb-1.5 block text-sm font-medium text-slate-700">
          Nama (opsional)
        </label>
        <input
          id="guest-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama Anda"
          className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/20"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {submitting ? "Memproses..." : "Check-in Sekarang"}
      </button>
    </form>
  );
}
