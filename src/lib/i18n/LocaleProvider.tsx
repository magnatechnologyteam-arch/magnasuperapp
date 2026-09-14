"use client";

import { createContext, useContext, type ReactNode } from "react";
import { t, type Locale } from "./dictionary";

const LocaleContext = createContext<Locale>("id");

/**
 * Tahap 33 — jembatan locale dari Server Component (AppShell, yang sudah
 * punya `profile.language_preference`) ke Client Component (Sidebar,
 * MobileNav, Topbar, GlobalSearch, dst) lewat React Context. Server
 * Component sendiri TIDAK perlu Provider ini — cukup panggil `t(locale,
 * text)` langsung karena async function biasa bisa terima `locale` sebagai
 * parameter (lihat dashboard/page.tsx & pengaturan/page.tsx).
 */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Hook singkat: `const t = useT(); t("Kelola Pengguna")`. */
export function useT() {
  const locale = useContext(LocaleContext);
  return (text: string) => t(locale, text);
}
