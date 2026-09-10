"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Menu, X } from "lucide-react";
import { ADMIN_LINKS, HUB_HREF, INVESTOR_LINKS, getVisibleModules } from "@/lib/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { cn } from "@/lib/cn";
import type { Division } from "@/lib/supabase/types";

/**
 * Pengganti Sidebar di layar kecil — sebelumnya strip pill yang di-scroll
 * horizontal (Tahap 25: diganti jadi laci/drawer lewat tombol hamburger,
 * biar layar mobile tidak penuh baris tombol dan terasa lebih bersih).
 * Isi lacinya SAMA PERSIS dengan Sidebar.tsx (Hub + Modul sesuai divisi +
 * link Investor/Admin) — sumber datanya tetap satu dari @/lib/navigation,
 * cuma tampilannya beda.
 */
export function MobileNav({ division }: { division?: Division | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const modules = getVisibleModules(division);
  const isFullAccess = division === "all";
  const isInvestor = division === "investor";

  // Laci otomatis tertutup begitu pindah halaman (klik salah satu link di
  // dalamnya) — tidak perlu onClick manual di tiap Link.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape buat menutup (pola sama dengan Modal.tsx) + kunci scroll body
  // selagi laci terbuka supaya halaman di belakangnya tidak ikut kescroll.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const activeModule = modules.find((mod) => pathname === mod.href || pathname.startsWith(`${mod.href}/`));
  const activeAdminLink = isFullAccess
    ? ADMIN_LINKS.find((link) => pathname === link.href || pathname.startsWith(`${link.href}/`))
    : undefined;
  const activeInvestorLink = isInvestor
    ? INVESTOR_LINKS.find((link) => pathname === link.href || pathname.startsWith(`${link.href}/`))
    : undefined;
  const currentLabel =
    pathname === HUB_HREF
      ? "Dashboard Hub"
      : activeModule?.label ?? activeAdminLink?.label ?? activeInvestorLink?.label ?? "Menu";

  function linkClass(isActive: boolean, activeClass: string) {
    return cn(
      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
      isActive
        ? activeClass
        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-black/5 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-950 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/5 bg-white text-zinc-600 shadow-sm dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <Menu className="h-4 w-4" />
        </button>
        <p className="truncate text-sm font-bold text-zinc-800 dark:text-zinc-100">{currentLabel}</p>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="animate-fade-in absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="animate-slide-in-left absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col bg-white shadow-xl dark:bg-zinc-950">
            <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-black/5 px-5 dark:border-white/10">
              <div className="flex items-center gap-3">
                <BrandLogo size={32} />
                <span className="text-[15px] font-bold tracking-tight text-zinc-900 dark:text-white">
                  MagnaSuperApp
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup menu"
                className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-5">
              <Link
                href={HUB_HREF}
                className={linkClass(pathname === HUB_HREF, "bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-white")}
              >
                <LayoutGrid className="h-[18px] w-[18px]" />
                Dashboard Hub
              </Link>

              {modules.length > 0 && (
                <div className="pt-5">
                  <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Modul
                  </p>
                  <ul className="space-y-1">
                    {modules.map((mod) => {
                      const isActive = pathname === mod.href || pathname.startsWith(`${mod.href}/`);
                      const Icon = mod.icon;
                      return (
                        <li key={mod.id}>
                          <Link href={mod.href} className={linkClass(isActive, mod.soft)}>
                            <Icon
                              className="h-[18px] w-[18px] shrink-0"
                              style={isActive ? { color: mod.solid } : undefined}
                            />
                            {mod.label}
                            {isActive && (
                              <span
                                className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ background: mod.gradient }}
                              />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {isInvestor && (
                <div className="pt-5">
                  <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Investor
                  </p>
                  <ul className="space-y-1">
                    {INVESTOR_LINKS.map((link) => {
                      const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                      const Icon = link.icon;
                      return (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className={linkClass(
                              isActive,
                              "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                            )}
                          >
                            <Icon className="h-[18px] w-[18px]" />
                            {link.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {isFullAccess && (
                <div className="pt-5">
                  <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Admin
                  </p>
                  <ul className="space-y-1">
                    {ADMIN_LINKS.map((link) => {
                      const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                      const Icon = link.icon;
                      return (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className={linkClass(isActive, "bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-white")}
                          >
                            <Icon className="h-[18px] w-[18px]" />
                            {link.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
