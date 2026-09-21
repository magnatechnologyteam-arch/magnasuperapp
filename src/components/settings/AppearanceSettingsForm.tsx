"use client";

import { useState } from "react";
import { ChevronRight, Laptop2, Moon, Sun } from "lucide-react";
import { updateLanguagePreference, updateThemePreference } from "@/lib/settings/actions";
import { useToast } from "@/components/ui/ToastProvider";
import { useT } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/cn";
import { LanguageDrawer } from "@/components/settings/LanguageDrawer";
import type { LanguagePreference, ThemePreference } from "@/lib/supabase/types";

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "system", label: "Ikuti Sistem", icon: Laptop2 },
];

/**
 * Update Opsional 1, item 4 — daftar bahasa sekarang 9 total (sebelumnya 4:
 * id/en/ms/zh sejak Tahap 33). Nama tiap bahasa SENGAJA ditulis dalam
 * bahasanya sendiri (bukan lewat `t()`) supaya penutur bahasa itu selalu
 * bisa mengenali pilihannya sendiri di daftar, apa pun bahasa aplikasi
 * yang sedang aktif — pola umum di pemilih bahasa aplikasi manapun.
 *
 * Infrastruktur terjemahan (`src/lib/i18n/dictionary.ts`) menutup seluruh
 * "shell" aplikasi (Sidebar, MobileNav, Topbar, Dashboard Hub, halaman
 * Pengaturan ini, Pencarian Global) — HALAMAN DETAIL tiap modul
 * (Magnarent/Magnativ/Production/Admin) masih Bahasa Indonesia, jadi kalau
 * pilih bahasa lain, bagian dalam modul akan tetap tampil ID sampai
 * menyusul diterjemahkan di tahap berikutnya.
 */
const LANGUAGE_OPTIONS: { value: LanguagePreference; label: string }[] = [
  { value: "id", label: "Bahasa Indonesia" },
  { value: "en", label: "English" },
  { value: "ms", label: "Bahasa Melayu" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "ar", label: "العربية" },
  { value: "fr", label: "Français" },
  { value: "th", label: "ไทย" },
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
 * Tahap 33: English/Bahasa Melayu/中文 sekarang aktif beneran — lihat
 * komentar di `LANGUAGE_OPTIONS` di atas untuk cakupan terjemahannya.
 */
export function AppearanceSettingsForm({
  initialTheme,
  initialLanguage,
}: {
  initialTheme: ThemePreference;
  initialLanguage: LanguagePreference;
}) {
  const { showToast } = useToast();
  const t = useT();
  const [theme, setTheme] = useState(initialTheme);
  const [language, setLanguage] = useState(initialLanguage);
  const [savingTheme, setSavingTheme] = useState(false);
  const [languageDrawerOpen, setLanguageDrawerOpen] = useState(false);
  const activeLanguageLabel =
    LANGUAGE_OPTIONS.find((opt) => opt.value === language)?.label ?? language;

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

  async function handleLanguageSelect(value: LanguagePreference) {
    setLanguageDrawerOpen(false);
    if (value === language) return;
    setLanguage(value);
    const result = await updateLanguagePreference(value);
    if (!result.ok) showToast(result.error, "error");
  }

  return (
    <div className="h-fit rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <h2 className="text-sm font-bold text-zinc-900 dark:text-white">{t("Tampilan & Bahasa")}</h2>

      <p className="mb-2 mt-4 text-xs font-semibold text-zinc-600 dark:text-zinc-300">{t("Tema")}</p>
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
              {t(opt.label)}
            </button>
          );
        })}
      </div>

      <p className="mb-2 mt-5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">{t("Bahasa")}</p>
      <button
        type="button"
        onClick={() => setLanguageDrawerOpen(true)}
        className="flex w-full items-center justify-between rounded-xl border border-black/10 px-3.5 py-2.5 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
      >
        <span>{activeLanguageLabel}</span>
        <ChevronRight className="h-4 w-4 text-zinc-400" />
      </button>

      <LanguageDrawer
        open={languageDrawerOpen}
        onClose={() => setLanguageDrawerOpen(false)}
        options={LANGUAGE_OPTIONS}
        value={language}
        onSelect={handleLanguageSelect}
      />
    </div>
  );
}
