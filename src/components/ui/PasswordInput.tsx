"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { GLASS_INPUT } from "@/lib/glass";

/**
 * Input password dengan tombol mata untuk tampil/sembunyi — dipakai di
 * halaman Login dan Atur Password Baru. Toggle-nya murni state lokal di
 * browser (tidak pernah mengirim apa pun ke server), jadi aman dipasang di
 * form manapun tanpa mengubah cara form itu submit.
 *
 * Tahap 46 lanjutan: dipindah ke GLASS_INPUT (sebelumnya border solid biasa,
 * satu-satunya kotak input di app yang belum ikut "Liquid Glass") + ring
 * fokus diperbaiki ke emas brand (sebelumnya `ring-indigo-500`, sisa warna
 * generik yang tidak senada dengan identitas Magna sama sekali).
 */
export function PasswordInput({
  id,
  name,
  placeholder,
  autoComplete,
  required,
  minLength,
}: {
  id?: string;
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
        id={id}
        type={visible ? "text" : "password"}
        name={name}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-xl border py-2.5 pl-10 pr-10 text-sm text-zinc-900 outline-none ring-[#D4AF37]/40 placeholder:text-zinc-400 focus:ring-2 dark:text-white",
          GLASS_INPUT
        )}
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
