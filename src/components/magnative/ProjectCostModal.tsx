"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Plus, Trash2, Wallet2 } from "lucide-react";
import { useMagnativeData } from "./MagnativeDataProvider";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateID, formatRupiah, todayISO } from "@/lib/shared/utils";
import type { Project } from "@/lib/magnative/types";

const GRADIENT = "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)";

function emptyCostForm() {
  return { description: "", amount: "0", costDate: todayISO() };
}

/**
 * Modal rekap biaya per proyek (migrasi 0017) — jawaban langsung untuk
 * permintaan investor (diteruskan owner): "ada link yg bisa kasih kita
 * rekapan cost dan kapannya (keluar atau masuk dana)". Sisi dana MASUK
 * sudah tercatat lewat invoice yang terhubung ke proyek ini (tab Faktur);
 * modal ini melengkapi sisi dana KELUAR, dan sengaja bisa dibuka di
 * proyek tahap apa pun — termasuk "Pitching" yang belum tentu deal, karena
 * biaya pitching yang gagal pun tetap pengeluaran nyata.
 */
export function ProjectCostModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const { getCostsForProject, addProjectCost, deleteProjectCost } = useMagnativeData();
  const { showToast } = useToast();
  const [form, setForm] = useState(emptyCostForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const costs = getCostsForProject(project.id);
  const totalBiaya = useMemo(() => costs.reduce((sum, c) => sum + c.amount, 0), [costs]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const amount = Number(form.amount);
    if (!form.description.trim()) {
      setError("Deskripsi biaya wajib diisi.");
      return;
    }
    if (!form.costDate) {
      setError("Tanggal wajib diisi.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Nominal harus lebih dari 0.");
      return;
    }

    setSubmitting(true);
    const result = await addProjectCost({
      projectId: project.id,
      description: form.description.trim(),
      amount,
      costDate: form.costDate,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setForm(emptyCostForm());
    setError(null);
    showToast("Biaya berhasil dicatat.");
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteProjectCost(id);
    setDeletingId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast("Biaya berhasil dihapus.");
  }

  return (
    <Modal open onClose={onClose} title={`Biaya Proyek — ${project.name}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 dark:bg-white/5">
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Total Biaya Tercatat</span>
          <span className="text-base font-bold text-zinc-900 dark:text-white">{formatRupiah(totalBiaya)}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="project-cost-description" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Deskripsi
            </label>
            <input
              id="project-cost-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="mis. Biaya pitching deck & presentasi"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="project-cost-amount" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Nominal (Rp)
              </label>
              <input
                id="project-cost-amount"
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="project-cost-date" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Tanggal
              </label>
              <input
                id="project-cost-date"
                type="date"
                value={form.costDate}
                onChange={(e) => setForm((f) => ({ ...f, costDate: e.target.value }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              style={{ background: GRADIENT }}
            >
              <Plus className="h-4 w-4" />
              {submitting ? "Menyimpan…" : "Catat Biaya"}
            </button>
          </div>
        </form>

        <div className="max-h-64 overflow-y-auto rounded-xl border border-black/5 dark:border-white/10">
          {costs.length === 0 ? (
            <EmptyState
              icon={Wallet2}
              title="Belum ada biaya tercatat"
              description="Catat pengeluaran pertama lewat form di atas."
            />
          ) : (
            <ul className="divide-y divide-black/5 dark:divide-white/5">
              {costs.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{c.description}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatDateID(c.costDate)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                      {formatRupiah(c.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      title="Hapus biaya"
                      aria-label="Hapus biaya"
                      className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
