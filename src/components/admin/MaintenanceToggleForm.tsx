"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { setMaintenanceBanner } from "@/lib/system-status/actions";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/cn";

export function MaintenanceToggleForm({
  initialActive,
  initialMessage,
}: {
  initialActive: boolean;
  initialMessage: string;
}) {
  const { showToast } = useToast();
  const [active, setActive] = useState(initialActive);
  const [message, setMessage] = useState(initialMessage);
  const [isPending, setIsPending] = useState(false);

  async function handleSave() {
    setIsPending(true);
    const result = await setMaintenanceBanner(active, message);
    setIsPending(false);

    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast(active ? "Banner update dinyalakan." : "Banner update dimatikan.");
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-zinc-900 dark:text-white">Banner Update</p>
          <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
            {active ? "Sedang menyala — semua pengguna melihatnya." : "Sedang mati — tidak ada banner tampil."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label="Nyalakan/matikan banner update"
          onClick={() => setActive((v) => !v)}
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full transition-colors",
            active ? "bg-amber-500" : "bg-zinc-200 dark:bg-white/10"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform",
              active ? "translate-x-[22px]" : "translate-x-0.5"
            )}
          />
        </button>
      </div>

      <div className="mt-4">
        <label htmlFor="maintenance-message" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          Pesan Banner
        </label>
        <textarea
          id="maintenance-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="mis. Sistem sedang diperbarui, mohon tunggu sebentar."
          className="w-full resize-none rounded-xl border border-black/10 bg-transparent px-3.5 py-2 text-sm text-zinc-900 outline-none ring-indigo-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Simpan
      </button>
    </div>
  );
}
