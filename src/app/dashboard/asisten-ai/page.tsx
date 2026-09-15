import { redirect } from "next/navigation";
import { Bot } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getAiMessages } from "@/lib/ai-assistant/actions";
import { AiAssistantClient } from "./AiAssistantClient";

/**
 * Halaman Asisten AI (Tahap 42) — permintaan Owner: chatbot AI pribadi di
 * dalam aplikasi, dijalankan lewat 9Router (gateway AI self-hosted milik
 * Magna sendiri). SENGAJA terbuka untuk SEMUA divisi TERMASUK investor —
 * tidak ada pengecekan/pengecualian divisi apa pun di sini, beda dari
 * halaman Chat tim (src/app/dashboard/chat/page.tsx) yang memblokir
 * investor. Satu-satunya syarat: sudah login (lihat requireAiAssistantAccess
 * di src/lib/ai-assistant/actions.ts).
 *
 * Riwayat AWAL diambil di server (SSR, ikut RLS lewat createClient() biasa)
 * supaya begitu halaman terbuka riwayat percakapan langsung kelihatan tanpa
 * jeda loading — pesan BERIKUTNYA (kirim & balasan AI) ditangani langsung di
 * AiAssistantClient (Client Component) tanpa polling, karena ini percakapan
 * PRIBADI satu user<->AI (bukan ruang bersama seperti Chat tim), jadi tidak
 * ada aktivitas dari pengguna lain yang perlu disinkronkan.
 */
export default async function AsistenAiPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const messages = await getAiMessages();

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-4 md:p-8">
      <div className="animate-fade-up flex shrink-0 items-start gap-4">
        <div className="relative shrink-0">
          <span
            className="absolute -inset-1.5 animate-pulse rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 opacity-30 blur-lg"
            aria-hidden
          />
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-sm">
            <Bot className="h-6 w-6" />
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-500 dark:text-emerald-400">
            Asisten AI
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Tanya Asisten AI
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Percakapan pribadi Anda dengan AI — tidak terlihat oleh staf lain, tersimpan otomatis.
          </p>
        </div>
      </div>

      <div className="mt-5 min-h-0 flex-1">
        <AiAssistantClient initialMessages={messages} currentUserName={profile.full_name} />
      </div>
    </div>
  );
}
