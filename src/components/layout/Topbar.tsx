"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, ShieldCheck, User as UserIcon } from "lucide-react";
import { signOut } from "@/lib/supabase/actions";
import { formatDisplayName } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";
import { DIVISION_LABELS, type Profile } from "@/lib/supabase/types";
import { PushNotificationBell } from "@/components/push/PushNotificationBell";

/**
 * Bar atas persisten di seluruh /dashboard/** — dipasang di AppShell,
 * bukan per-halaman, jadi tidak remount saat pindah modul. Menampilkan
 * identitas pengguna yang sedang login (dari profiles table Supabase) dan
 * tombol "Keluar". `user` bisa null sesaat (mis. trigger profiles belum
 * sempat jalan) — ditangani dengan fallback yang tetap masuk akal.
 */
function greetingForHour(hour: number): string {
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 19) return "Selamat sore";
  return "Selamat malam";
}

export function Topbar({ user }: { user: (Profile & { email: string }) | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Mulai dari sapaan netral (sama di server & klien) supaya tidak ada
  // hydration mismatch akibat jam server vs jam browser — begitu mount,
  // langsung disesuaikan ke jam sungguhan si pengguna.
  const [greeting, setGreeting] = useState("Halo");

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const displayName = formatDisplayName(user?.full_name, user?.email) || "Pengguna";
  const email = user?.email ?? "";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-black/5 bg-white/80 px-4 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/80 md:px-8">
      <p className="text-sm font-semibold text-zinc-900 dark:text-white">
        {greeting}, {displayName.split(" ")[0]}
      </p>

      <div className="flex items-center gap-2.5">
      <PushNotificationBell />
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-full border border-black/5 bg-white py-1.5 pl-1.5 pr-3 shadow-sm transition-colors hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-white/5"
        >
          <span className="relative shrink-0">
            {/* Foto profil belum ada — placeholder template siluet, tinggal
                ganti dengan foto asli staf begitu fitur upload foto tersedia. */}
            <span className="grid h-8 w-8 place-items-center rounded-full bg-zinc-200 text-zinc-400 dark:bg-white/10 dark:text-zinc-500">
              <UserIcon className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-zinc-950">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-75" />
            </span>
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-xs font-semibold leading-tight text-zinc-800 dark:text-zinc-100">
              {displayName}
            </span>
            <span className="block text-[11px] leading-tight text-zinc-400 dark:text-zinc-500">
              {DIVISION_LABELS[user?.division ?? "production"]}
            </span>
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-400 transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="animate-fade-in absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-xl shadow-black/10 dark:border-white/10 dark:bg-zinc-900">
            <div className="border-b border-black/5 px-4 py-3 dark:border-white/10">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{displayName}</p>
              <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">
                {user?.username ? `@${user.username}` : email}
              </p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                <ShieldCheck className="h-3 w-3" />
                {DIVISION_LABELS[user?.division ?? "production"]}
              </span>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </form>
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
