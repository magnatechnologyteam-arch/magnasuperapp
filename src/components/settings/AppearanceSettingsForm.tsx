"use client";

import { useState } from "react";
import { Check, Laptop2, Moon, Sun } from "lucide-react";
import { updateLanguagePreference, updateThemePreference } from "@/lib/settings/actions";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/cn";
import type { LanguagePreference, ThemePreference } from "@/lib/supabase/types";

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "system", label: "Ikuti Sistem", icon: Laptop2 },
];

const LANGUAGE_OPTIONS: { value: LanguagePreference; label: string; available: boolean }[] = [
  { value: "id", label: "Bahasa Indonesia", available: true },
  { value: "en", label: "English", available: false },
];

/**
 * Kartu "Tampilan & Bahasa". Tema langsung diterapkan ke <html> di klien
 * (classList) begitu diklik — tidak nunggu server-round trip — BARU
 * disimpan ke database lewat Server Action supaya persist ke perangkat
 * lain juga. Kalau simpannya gagal, pilihan visualnya tetap dibiarkan
 * (bukan dikembalikan) karena baris di halaman sudah kepalang berubah dan
 * membalikkannya lagi terasa aneh bagi pengguna — cukup kasih tahu lewat
 * toast supaya dia tahu perlu coba lagi.
 *
 * Bahasa Inggris masih ditampilkan tapi nonaktif ("Segera hadir") — kolom
 * & infrastrukturnya sudah disiapkan di database, tapi seluruh teks
 * aplikasi memang ditulis dalam Bahasa Indonesia dan belum diterjemahkan.
 * Menyalakannya sekarang cuma akan menyimpan pilihan tanpa efek apa pun,
 * yang lebih membingungkan daripada jujur bilang belum tersedia.
 */
export function AppearanceSettingsForm({
  initialTheme,
  initialLanguage,
}: {
  initialTheme: ThemePreference;
  initialLanguage: LanguagePreference;
}) {
  const { showToast } = useToast();
  const [theme, setTheme] = useState(initialTheme);
  const [language, setLanguage] = useState(initialLanguage);
  const [savingTheme, setSavingTheme] = useState(false);

  function applyThemeToDocument(value: ThemePreference) {
    const root = document.documentElement;
    if (value === "dark") {
      root.classList.add("dark");
    } else if (value === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    }
  }

  async function handleThemeSelect(value: ThemePreference) {
    if (value === theme || savingTheme) return;
    setTheme(value);
    applyThemeToDocument(value);
    setSavingTheme(true);
    const result = await updateThemePreference(value);
    setSavingTheme(false);
    if (!result.ok) showToast(result.error, "error");
  }

  async function handleLanguageSelect(value: LanguagePreference, available: boolean) {
    if (!available || value === language) return;
    setLanguage(value);
    const result = await updateLanguagePreference(value);
    if (!result.ok) showToast(result.error, "error");
  }

  return (
    <div className="h-fit rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Tampilan & Bahasa</h2>

      <p className="mb-2 mt-4 text-xs font-semibold text-zinc-600 dark:text-zinc-300">Tema</p>
      <div className="grid grid-cols-3 gap-2">
        {THEME_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleThemeSelect(opt.value)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-semibold transition-colors",
                isActive
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300"
                  : "border-black/10 text-zinc-500 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5"
              )}
            >
              <Icon className="h-4 w-4" />
              {opt.label}
            </button>
          );
        })}
      </div>

      <p className="mb-2 mt-5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">Bahasa</p>
      <div className="space-y-1.5">
        {LANGUAGE_OPTIONS.map((opt) => {
          const isActive = language === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleLanguageSelect(opt.value, opt.available)}
              disabled={!opt.available}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-colors",
                isActive
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300"
                  : opt.available
                    ? "border-black/10 text-zinc-600 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
                    : "cursor-not-allowed border-black/5 text-zinc-300 dark:border-white/5 dark:text-zinc-600"
              )}
            >
              <span>{opt.label}</span>
              {isActive ? (
                <Check className="h-4 w-4" />
              ) : !opt.available ? (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400 dark:bg-white/5 dark:text-zinc-500">
                  Segera Hadir
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
