import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { updatePassword } from "../actions";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div>
      <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Atur Password Baru</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Masukkan password baru untuk akun Anda.
      </p>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <form action={updatePassword} className="mt-6 space-y-4">
        <div>
          <label htmlFor="reset-password-new" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Password Baru
          </label>
          <PasswordInput id="reset-password-new" name="password" required minLength={6} autoComplete="new-password" placeholder="min. 6 karakter" />
        </div>
        <div>
          <label htmlFor="reset-password-confirm" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Konfirmasi Password
          </label>
          <PasswordInput
            id="reset-password-confirm"
            name="confirmPassword"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="ulangi password baru"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          Simpan Password Baru
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/login" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
          Batal, kembali ke halaman masuk
        </Link>
      </p>
    </div>
  );
}
