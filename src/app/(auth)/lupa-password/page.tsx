import Link from "next/link";
import { CheckCircle2, Mail } from "lucide-react";
import { requestPasswordReset } from "../actions";

export default async function LupaPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;

  return (
    <div>
      <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Lupa Password</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Masukkan email pemulihan akun Anda (Gmail atau email lain yang didaftarkan) — kalau
        terdaftar, kami kirim tautan reset ke email itu.
      </p>

      {notice && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {notice}
        </div>
      )}

      <form action={requestPasswordReset} className="mt-6 space-y-4">
        <div>
          <label htmlFor="lupa-password-email" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Email Pemulihan
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              id="lupa-password-email"
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="email pemulihan Anda"
              className="w-full rounded-xl border border-black/10 bg-transparent py-2.5 pl-10 pr-3.5 text-sm text-zinc-900 outline-none ring-indigo-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          Kirim Tautan Reset
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/login" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
          Kembali ke halaman masuk
        </Link>
      </p>
    </div>
  );
}
