"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import { createPortalLink, revokePortalLink, listPortalLinks, type MutationResult } from "@/lib/portal/actions";
import type { PortalModule } from "@/lib/portal/types";

type LinkRow = Awaited<ReturnType<typeof listPortalLinks>>[number];

/**
 * Modal "Bagikan ke Klien" -- dipasang di detail proyek Magnativ, booking
 * Magnarent, dan proyek Production (pola sama seperti Modal lain di modul
 * ini, mis. `ProjectVendorModal`). Membuat link portal (magic token) lalu
 * menawarkan share langsung ke WhatsApp, sesuai kebiasaan komunikasi bisnis
 * Indonesia (riset kompetitor lokal Bagian 4, item #1).
 */
export function PortalShareModal({
  module,
  entityId,
  entityLabel,
  clientName,
  onClose,
}: {
  module: PortalModule;
  entityId: string;
  entityLabel: string;
  clientName?: string;
  onClose: () => void;
}) {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPortalLinks(module, entityId).then((rows) => {
      setLinks(rows);
      setLoading(false);
    });
  }, [module, entityId]);

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const res: MutationResult & { token?: string } = await createPortalLink({
        module,
        entityId,
        clientName,
        expiresInDays: 30,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const rows = await listPortalLinks(module, entityId);
      setLinks(rows);
    });
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      await revokePortalLink(id, module);
      setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, revoked: true } : l)));
    });
  }

  function portalUrl(token: string) {
    return `${window.location.origin}/portal/${token}`;
  }

  function waLink(token: string) {
    const text = encodeURIComponent(
      `Halo${clientName ? " " + clientName : ""}, berikut link untuk memantau progres & tanda tangan dokumen: ${portalUrl(token)}`
    );
    return `https://wa.me/?text=${text}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-zinc-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Bagikan ke Klien — {entityLabel}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={handleCreate}
          className="mb-3 w-full rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
        >
          {isPending ? "Membuat..." : "+ Buat Link Portal Baru"}
        </button>
        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
        {loading ? (
          <p className="text-xs text-zinc-400">Memuat...</p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {links.length === 0 && <li className="text-xs text-zinc-400">Belum ada link portal.</li>}
            {links.map((l) => (
              <li key={l.id} className="rounded-md border border-zinc-100 bg-zinc-50 p-2 text-xs dark:border-zinc-800 dark:bg-zinc-800/50">
                <span className={l.revoked ? "text-zinc-400 line-through" : "text-zinc-700 dark:text-zinc-200"}>
                  {portalUrl(l.token).replace(/^https?:\/\//, "")}
                </span>
                {!l.revoked && (
                  <div className="mt-1 flex gap-3">
                    <a href={waLink(l.token)} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline">
                      Kirim WhatsApp
                    </a>
                    <button type="button" onClick={() => handleRevoke(l.id)} className="text-red-600 hover:underline">
                      Cabut
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
