"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AlertCircle, Inbox, Plus, Trash2 } from "lucide-react";
import { useMagnativeData } from "./MagnativeDataProvider";
import { addContentRequest, deleteContentRequest, updateContentRequestStatus } from "@/lib/magnative/actions";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateID, todayISO } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";
import type { ContentRequest, ContentRequestPriority, ContentRequestStatus } from "@/lib/magnative/types";
import { CONTENT_REQUEST_PRIORITY_STYLES, CONTENT_REQUEST_STATUS_STYLES } from "@/lib/status-styles";

const GRADIENT = "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)";
const ALL_PRIORITIES: ContentRequestPriority[] = ["Rendah", "Sedang", "Tinggi"];
const STATUS_FLOW: ContentRequestStatus[] = ["Baru", "Diproses", "Selesai", "Ditolak"];

function emptyForm() {
  return { clientId: "", title: "", description: "", deadline: "", priority: "Sedang" as ContentRequestPriority, catatan: "" };
}

/**
 * Antrean permintaan konten dari klien (Tahap 28b) — staf mencatat
 * permintaan mentah yang masuk (lewat telepon/WA/email), lalu memindahkan
 * statusnya (Baru → Diproses → Selesai, atau Ditolak) sambil membuatkan
 * jadwal konten sungguhan di tab "Sosial Media" secara terpisah. Lihat
 * komentar `ContentRequest` di types.ts untuk alasan dua tabel ini tidak
 * ditautkan otomatis.
 */
export function ContentRequestManager({ requests }: { requests: ContentRequest[] }) {
  const { clients } = useMagnativeData();
  const { showToast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContentRequest | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";

  const sortedRequests = useMemo(
    () =>
      [...requests].sort((a, b) => {
        // Belum ditindaklanjuti (Baru) di atas, sisanya diurutkan oleh deadline terdekat.
        if (a.status === "Baru" && b.status !== "Baru") return -1;
        if (b.status === "Baru" && a.status !== "Baru") return 1;
        return (a.deadline ?? "9999-99-99").localeCompare(b.deadline ?? "9999-99-99");
      }),
    [requests]
  );

  function closeFormModal() {
    setFormOpen(false);
    setForm(emptyForm());
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.clientId) {
      setError("Klien wajib dipilih.");
      return;
    }
    if (!form.title.trim() || !form.description.trim()) {
      setError("Judul dan deskripsi kebutuhan wajib diisi.");
      return;
    }

    setSubmitting(true);
    const result = await addContentRequest({
      clientId: form.clientId,
      title: form.title.trim(),
      description: form.description.trim(),
      deadline: form.deadline || undefined,
      priority: form.priority,
      catatan: form.catatan.trim() || undefined,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    showToast(`Permintaan "${form.title.trim()}" berhasil dicatat.`);
    closeFormModal();
  }

  async function handleStatusChange(req: ContentRequest, status: ContentRequestStatus) {
    setStatusUpdatingId(req.id);
    const result = await updateContentRequestStatus(req.id, status);
    setStatusUpdatingId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast(`Permintaan "${req.title}" sekarang berstatus "${status}".`);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const result = await deleteContentRequest(deleteTarget.id);
    if (!result.ok) {
      showToast(result.error, "error");
      setDeleteTarget(null);
      return;
    }
    showToast(`Permintaan "${deleteTarget.title}" berhasil dihapus.`);
    setDeleteTarget(null);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Permintaan Konten dari Klien</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {requests.filter((r) => r.status === "Baru").length} permintaan baru dari {requests.length} total
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          disabled={clients.length === 0}
          title={clients.length === 0 ? "Tambah klien terlebih dahulu di tab Klien" : undefined}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
          style={{ background: GRADIENT }}
        >
          <Plus className="h-4 w-4" />
          Catat Permintaan
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <th className="px-5 py-3">Permintaan</th>
                <th className="px-5 py-3">Klien</th>
                <th className="px-5 py-3">Deadline</th>
                <th className="px-5 py-3">Prioritas</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sortedRequests.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Inbox}
                      title="Belum ada permintaan konten"
                      description='Klik "Catat Permintaan" begitu ada klien yang minta dibuatkan konten.'
                    />
                  </td>
                </tr>
              )}
              {sortedRequests.map((r) => (
                <tr key={r.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-5 py-3">
                    <p className="font-medium text-zinc-900 dark:text-white">{r.title}</p>
                    <p className="mt-0.5 max-w-[260px] truncate text-xs text-zinc-500 dark:text-zinc-400">{r.description}</p>
                  </td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{clientName(r.clientId)}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                    {r.deadline ? (
                      formatDateID(r.deadline)
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", CONTENT_REQUEST_PRIORITY_STYLES[r.priority])}>
                      {r.priority}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={r.status}
                      disabled={statusUpdatingId === r.id}
                      onChange={(e) => handleStatusChange(r, e.target.value as ContentRequestStatus)}
                      className={cn(
                        "rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ring-fuchsia-500/40 focus:ring-2 disabled:opacity-50 dark:[&>option]:bg-zinc-900",
                        CONTENT_REQUEST_STATUS_STYLES[r.status]
                      )}
                    >
                      {STATUS_FLOW.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(r)}
                        title="Hapus permintaan"
                        aria-label="Hapus permintaan"
                        className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={formOpen} onClose={closeFormModal} title="Catat Permintaan Konten Baru">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="request-client" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Klien
            </label>
            <select
              id="request-client"
              value={form.clientId}
              onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:text-white dark:[&>option]:bg-zinc-900"
            >
              <option value="">Pilih klien…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="request-title" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Judul Permintaan
            </label>
            <input
              id="request-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="mis. Konten promo pembukaan cabang baru"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="request-description" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Detail Kebutuhan
            </label>
            <textarea
              id="request-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="mis. 3 konten Instagram feed + 1 reel, gaya santai, highlight promo diskon 20%"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="request-deadline" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Deadline (opsional)
              </label>
              <input
                id="request-deadline"
                type="date"
                min={todayISO()}
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="request-priority" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Prioritas
              </label>
              <select
                id="request-priority"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as ContentRequestPriority }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:text-white dark:[&>option]:bg-zinc-900"
              >
                {ALL_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="request-catatan" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Catatan Internal (opsional)
            </label>
            <input
              id="request-catatan"
              value={form.catatan}
              onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
              placeholder="mis. sumber permintaan: WA PIC klien"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>

          {error && (
            <p className="flex items-start gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
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
              {submitting ? "Menyimpan…" : "Simpan Permintaan"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Hapus Permintaan"
        description={
          deleteTarget && (
            <>
              Yakin hapus permintaan <strong>{deleteTarget.title}</strong>? Tindakan ini tidak bisa dibatalkan.
            </>
          )
        }
      />
    </div>
  );
}
