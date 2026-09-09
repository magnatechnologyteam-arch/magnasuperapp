"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, HandCoins, MapPin, TrendingDown, TrendingUp, XCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateID, formatRupiah } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";
import type { CapitalRequest, CapitalRequestStatus } from "@/lib/capital-requests/types";
import { decideCapitalRequest } from "@/lib/capital-requests/actions";

const STATUS_STYLES: Record<CapitalRequestStatus, string> = {
  Menunggu: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Disetujui: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Ditolak: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

/** Warna avatar ikon per kartu — status "Menunggu" pakai warna netral/amber
 * supaya kontras dengan kartu yang sudah diputuskan (hijau/merah), konsisten
 * dengan pola avatar-berwarna di `InvestorSectionHeader`/`ClientDirectoryTable`. */
const ICON_BG: Record<CapitalRequestStatus, string> = {
  Menunggu: "#F59E0B",
  Disetujui: "#10B981",
  Ditolak: "#EF4444",
};

/**
 * Kotak masuk investor untuk "Pengajuan Modal" (rancangan Owner: "Notifikasi
 * = notif masuk untuk event dalam pengajuan modal, Approve/Reject dan
 * berikan note untuk keterangan"). Keputusan lewat `decideCapitalRequest`,
 * yang di baliknya memanggil fungsi database `decide_capital_request`
 * (migrasi 0019) — mengunci baris supaya tidak bisa diputuskan dua kali.
 *
 * Dipisah jadi dua seksi ("Menunggu Keputusan"/"Riwayat Keputusan") dan
 * dibatasi lebarnya (max-w-3xl) supaya tidak terasa kosong/berantakan kalau
 * cuma ada sedikit pengajuan — sebelumnya satu daftar rata kiri selebar
 * layar dengan ruang kosong besar di bawah kartu terakhir. Angka yang
 * ditampilkan cuma "Modal Dibutuhkan" & "Estimasi Pendapatan" — sengaja TIDAK
 * ada "Margin"/persentase: itu cuma rumus turunan (Billing − Modal) / Billing,
 * bukan angka yang perlu dilihat investor untuk memutuskan.
 */
export function CapitalRequestInbox({ requests }: { requests: CapitalRequest[] }) {
  const { showToast } = useToast();

  const [decisionTarget, setDecisionTarget] = useState<{ request: CapitalRequest; status: CapitalRequestStatus } | null>(
    null
  );
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pending = useMemo(
    () => requests.filter((r) => r.status === "Menunggu").sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [requests]
  );
  const decided = useMemo(
    () =>
      requests
        .filter((r) => r.status !== "Menunggu")
        .sort((a, b) => (b.decidedAt ?? b.createdAt).localeCompare(a.decidedAt ?? a.createdAt)),
    [requests]
  );

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
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">Kotak Masuk Pengajuan Modal</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {pending.length > 0 ? `${pending.length} menunggu keputusan Anda` : "Tidak ada yang menunggu keputusan"} —{" "}
          {requests.length} total tercatat.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <EmptyState
            icon={HandCoins}
            title="Belum ada pengajuan modal"
            description="Begitu Owner mengajukan modal untuk event baru, akan muncul di sini."
          />
        </div>
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <section>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Menunggu Keputusan
              </p>
              <div className="space-y-3">
                {pending.map((req) => (
                  <RequestCard key={req.id} request={req} onDecide={openDecision} />
                ))}
              </div>
            </section>
          )}

          {decided.length > 0 && (
            <section>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Riwayat Keputusan
              </p>
              <div className="space-y-3">
                {decided.map((req) => (
                  <RequestCard key={req.id} request={req} onDecide={openDecision} />
                ))}
              </div>
            </section>
          )}
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

function RequestCard({
  request: req,
  onDecide,
}: {
  request: CapitalRequest;
  onDecide: (request: CapitalRequest, status: CapitalRequestStatus) => void;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-zinc-900 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-sm"
            style={{ background: ICON_BG[req.status] }}
          >
            <HandCoins className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">{req.eventName}</h3>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLES[req.status])}>
                {req.status}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {req.location || "Lokasi belum diisi"}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                {req.eventDate ? formatDateID(req.eventDate) : "Tanggal belum pasti"}
              </span>
            </div>
          </div>
        </div>
        {req.status === "Menunggu" && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => onDecide(req, "Ditolak")}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3.5 py-1.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </button>
            <button
              type="button"
              onClick={() => onDecide(req, "Disetujui")}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-zinc-50 p-3 dark:bg-white/5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
            <TrendingDown className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">Modal Dibutuhkan</p>
            <p className="truncate text-base font-extrabold text-zinc-900 dark:text-white">
              {formatRupiah(req.modalEstimate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl bg-zinc-50 p-3 dark:bg-white/5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">Estimasi Pendapatan</p>
            <p className="truncate text-base font-extrabold text-zinc-900 dark:text-white">
              {formatRupiah(req.billingEstimate)}
            </p>
          </div>
        </div>
      </div>

      {req.status !== "Menunggu" && req.decidedAt && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
          <Clock className="h-3.5 w-3.5" />
          Diputuskan {formatDateID(req.decidedAt.slice(0, 10))}
        </p>
      )}

      {req.investorNote && (
        <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
          Catatan Anda: &ldquo;{req.investorNote}&rdquo;
        </p>
      )}
    </div>
  );
}
