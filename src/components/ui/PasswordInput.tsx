"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

/**
 * Input password dengan tombol mata untuk tampil/sembunyi — dipakai di
 * halaman Login dan Atur Password Baru. Toggle-nya murni state lokal di
 * browser (tidak pernah mengirim apa pun ke server), jadi aman dipasang di
 * form manapun tanpa mengubah cara form itu submit.
 */
export function PasswordInput({
  name,
  placeholder,
  autoComplete,
  required,
  minLength,
}: {
  name: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <input
        type={visible ? "text" : "password"}
        name={name}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full rounded-xl border border-black/10 bg-transparent py-2.5 pl-10 pr-10 text-sm text-zinc-900 outline-none ring-indigo-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
