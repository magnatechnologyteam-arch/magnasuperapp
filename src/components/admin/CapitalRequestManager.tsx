"use client";

import { useMemo, useState, type FormEvent } from "react";
import { HandCoins, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateID, formatRupiah } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";
import type { CapitalRequest, CapitalRequestStatus } from "@/lib/capital-requests/types";
import { addCapitalRequest, deleteCapitalRequest } from "@/lib/capital-requests/actions";

const GRADIENT = "linear-gradient(135deg, #10B981 0%, #059669 100%)";

const STATUS_STYLES: Record<CapitalRequestStatus, string> = {
  Menunggu: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Disetujui: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Ditolak: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

function emptyForm() {
  return { eventName: "", location: "", eventDate: "", billingEstimate: "0", modalEstimate: "0" };
}

/**
 * Sisi Owner dari "Pengajuan Modal" (rancangan Owner di papan tulis): Owner
 * mengajukan perkiraan pendapatan & modal yang dibutuhkan untuk sebuah event
 * SEBELUM digarap, lalu akun investor yang memutuskan lewat kotak masuk
 * terpisah (lihat src/components/investor/CapitalRequestInbox.tsx). Halaman
 * ini HANYA untuk akses penuh — dijaga di page.tsx & Server Action
 * (addCapitalRequest). Sengaja TIDAK menampilkan angka "margin" — itu cuma
 * rumus internal, bukan sesuatu yang perlu dilihat Owner/investor di UI.
 */
export function CapitalRequestManager({ requests }: { requests: CapitalRequest[] }) {
  const { showToast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CapitalRequest | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [requests]
  );

  const billingNum = Number(form.billingEstimate) || 0;
  const modalNum = Number(form.modalEstimate) || 0;

  function openAddModal() {
    setForm(emptyForm());
    setError(null);
    setFormOpen(true);
  }

  function closeFormModal() {
    setFormOpen(false);
    setForm(emptyForm());
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!form.eventName.trim()) {
      setError("Nama event wajib diisi.");
      return;
    }
    if (!Number.isFinite(billingNum) || billingNum < 0 || !Number.isFinite(modalNum) || modalNum < 0) {
      setError("Billing/Modal harus angka valid.");
      return;
    }

    setSubmitting(true);
    const result = await addCapitalRequest({
      eventName: form.eventName.trim(),
      location: form.location.trim(),
      eventDate: form.eventDate || undefined,
      billingEstimate: billingNum,
      modalEstimate: modalNum,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    showToast(`Pengajuan modal "${form.eventName.trim()}" terkirim ke investor.`);
    closeFormModal();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setActingId(deleteTarget.id);
    const result = await deleteCapitalRequest(deleteTarget.id);
    setActingId(null);
    setDeleteTarget(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast("Pengajuan dihapus.");
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Daftar Pengajuan Modal</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {requests.length} pengajuan tercatat — status diputuskan oleh akun investor.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: GRADIENT }}
        >
          <Plus className="h-4 w-4" />
          Ajukan Modal
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <th className="px-5 py-3">Event</th>
                <th className="px-5 py-3">Lokasi</th>
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3 text-right">Estimasi Pendapatan</th>
                <th className="px-5 py-3 text-right">Modal Dibutuhkan</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={HandCoins}
                      title="Belum ada pengajuan modal"
                      description='Klik "Ajukan Modal" untuk mengajukan event baru ke investor.'
                    />
                  </td>
                </tr>
              )}
              {sorted.map((req) => {
                return (
                  <tr key={req.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                    <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{req.eventName}</td>
                    <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{req.location || "—"}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                      {req.eventDate ? formatDateID(req.eventDate) : "Belum pasti"}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                      {formatRupiah(req.billingEstimate)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                      {formatRupiah(req.modalEstimate)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLES[req.status])}>
                        {req.status}
                      </span>
                      {req.investorNote && (
                        <p className="mt-1 max-w-[200px] text-[11px] text-zinc-400 dark:text-zinc-500">
                          &ldquo;{req.investorNote}&rdquo;
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        {req.status === "Menunggu" && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(req)}
                            disabled={actingId === req.id}
                            title="Hapus pengajuan"
                            className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={formOpen} onClose={closeFormModal} title="Ajukan Modal Event Baru">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Nama Event</label>
            <input
              value={form.eventName}
              onChange={(e) => setForm((f) => ({ ...f, eventName: e.target.value }))}
              placeholder="mis. Wedding Expo Jakarta 2026"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Lokasi</label>
            <input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="mis. JCC Senayan"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Tanggal (opsional — boleh dikosongkan kalau belum pasti)
            </label>
            <input
              type="date"
              value={form.eventDate}
              onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Estimasi Pendapatan
              </label>
              <input
                type="number"
                min={0}
                value={form.billingEstimate}
                onChange={(e) => setForm((f) => ({ ...f, billingEstimate: e.target.value }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Modal Dibutuhkan
              </label>
              <input
                type="number"
                min={0}
                value={form.modalEstimate}
                onChange={(e) => setForm((f) => ({ ...f, modalEstimate: e.target.value }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeFormModal}
              className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              style={{ background: GRADIENT }}
            >
              {submitting ? "Mengirim…" : "Kirim ke Investor"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Hapus Pengajuan"
        description={
          deleteTarget && (
            <>
              Yakin hapus pengajuan modal <strong>{deleteTarget.eventName}</strong>? Tindakan ini tidak bisa dibatalkan.
            </>
          )
        }
      />
    </div>
  );
}
