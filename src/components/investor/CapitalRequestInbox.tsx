"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, HandCoins, XCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateID, formatRupiah } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";
import { calculateMargin, type CapitalRequest, type CapitalRequestStatus } from "@/lib/capital-requests/types";
import { decideCapitalRequest } from "@/lib/capital-requests/actions";

const STATUS_STYLES: Record<CapitalRequestStatus, string> = {
  Menunggu: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Disetujui: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Ditolak: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

/**
 * Kotak masuk investor untuk "Pengajuan Modal" (rancangan Owner: "Notifikasi
 * = notif masuk untuk event dalam pengajuan modal, Approve/Reject dan
 * berikan note untuk keterangan"). Keputusan lewat `decideCapitalRequest`,
 * yang di baliknya memanggil fungsi database `decide_capital_request`
 * (migrasi 0019) — mengunci baris supaya tidak bisa diputuskan dua kali.
 */
export function CapitalRequestInbox({ requests }: { requests: CapitalRequest[] }) {
  const { showToast } = useToast();

  const [decisionTarget, setDecisionTarget] = useState<{ request: CapitalRequest; status: CapitalRequestStatus } | null>(
    null
  );
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sorted = useMemo(() => {
    const rank: Record<CapitalRequestStatus, number> = { Menunggu: 0, Disetujui: 1, Ditolak: 1 };
    return [...requests].sort((a, b) => rank[a.status] - rank[b.status] || b.createdAt.localeCompare(a.createdAt));
  }, [requests]);

  const pendingCount = requests.filter((r) => r.status === "Menunggu").length;

  function openDecision(request: CapitalRequest, status: CapitalRequestStatus) {
    setDecisionTarget({ request, status });
    setNote("");
  }

  function closeDecision() {
    setDecisionTarget(null);
    setNote("");
  }

  async function confirmDecision() {
    if (!decisionTarget) return;
    setSubmitting(true);
    const result = await decideCapitalRequest(decisionTarget.request.id, decisionTarget.status, note);
    setSubmitting(false);

    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast(
      decisionTarget.status === "Disetujui"
        ? `"${decisionTarget.request.eventName}" disetujui — staf sudah dapat pengumuman.`
        : `"${decisionTarget.request.eventName}" ditolak.`
    );
    closeDecision();
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">Kotak Masuk Pengajuan Modal</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {pendingCount > 0 ? `${pendingCount} menunggu keputusan Anda` : "Tidak ada yang menunggu keputusan"} —{" "}
          {requests.length} total tercatat.
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <EmptyState
            icon={HandCoins}
            title="Belum ada pengajuan modal"
            description="Begitu Owner mengajukan modal untuk event baru, akan muncul di sini."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((req) => {
            const margin = calculateMargin(req.billingEstimate, req.modalEstimate);
            return (
              <div
                key={req.id}
                className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">{req.eventName}</h3>
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLES[req.status])}>
                        {req.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      {req.location || "Lokasi belum diisi"} ·{" "}
                      {req.eventDate ? formatDateID(req.eventDate) : "Tanggal belum pasti"}
                    </p>
                  </div>
                  {req.status === "Menunggu" && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openDecision(req, "Ditolak")}
                        className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3.5 py-1.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => openDecision(req, "Disetujui")}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-zinc-50 p-3 text-sm dark:bg-white/5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      Billing (A1)
                    </p>
                    <p className="font-bold text-zinc-800 dark:text-zinc-100">{formatRupiah(req.billingEstimate)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      Modal (A2)
                    </p>
                    <p className="font-bold text-zinc-800 dark:text-zinc-100">{formatRupiah(req.modalEstimate)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      Margin
                    </p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{margin.toFixed(1)}%</p>
                  </div>
                </div>

                {req.investorNote && (
                  <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                    Catatan Anda: &ldquo;{req.investorNote}&rdquo;
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={decisionTarget !== null}
        onClose={closeDecision}
        title={decisionTarget?.status === "Disetujui" ? "Approve Pengajuan Modal" : "Reject Pengajuan Modal"}
      >
        <div className="space-y-4">
          {decisionTarget && (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {decisionTarget.status === "Disetujui" ? (
                <>
                  <strong>{decisionTarget.request.eventName}</strong> akan disetujui — staf Magnarent/Magnativ/
                  Production otomatis dapat pengumuman untuk bersiap.
                </>
              ) : (
                <>
                  <strong>{decisionTarget.request.eventName}</strong> akan ditolak. Event tidak dilanjutkan.
                </>
              )}
            </p>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Catatan (opsional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="mis. alasan keputusan, syarat tambahan, dsb."
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={closeDecision}
              className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={confirmDecision}
              disabled={submitting}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60",
                decisionTarget?.status === "Disetujui" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
              )}
            >
              {submitting ? "Menyimpan…" : decisionTarget?.status === "Disetujui" ? "Ya, Approve" : "Ya, Reject"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
