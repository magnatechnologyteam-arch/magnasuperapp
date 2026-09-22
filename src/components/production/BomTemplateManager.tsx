"use client";

import { useState, type FormEvent } from "react";
import { ClipboardList, Pencil, Plus, Trash2, X as XIcon } from "lucide-react";
import { useProductionData } from "./ProductionDataProvider";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import {
  createBomTemplate,
  deleteBomTemplate,
  updateBomTemplate,
} from "@/lib/production/extras-actions";
import type { BomTemplate, BomTemplateItem } from "@/lib/production/extras-types";

const GRADIENT = "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)";

type ItemRow = { materialId: string; qty: string };

function emptyForm() {
  return { name: "", description: "" };
}

/**
 * Template BOM per tipe booth (Tahap 44 — gap #2 analisis-gap-production.md)
 * — resep alokasi material yang bisa dipakai ulang ("Muat dari Template" di
 * `BoothProjectManager`), supaya tidak input dari nol tiap proyek baru.
 * `items` disimpan jsonb, pola sama dengan alokasi material di form proyek.
 */
export function BomTemplateManager({ templates }: { templates: BomTemplate[] }) {
  const { materials } = useProductionData();
  const { showToast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [itemRows, setItemRows] = useState<ItemRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BomTemplate | null>(null);

  const materialName = (id: string) => materials.find((m) => m.id === id)?.name ?? "—";

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm());
    setItemRows([]);
    setError(null);
    setFormOpen(true);
  }

  function openEditModal(t: BomTemplate) {
    setEditingId(t.id);
    setForm({ name: t.name, description: t.description ?? "" });
    setItemRows(t.items.map((i) => ({ materialId: i.materialId, qty: String(i.qty) })));
    setError(null);
    setFormOpen(true);
  }

  function closeFormModal() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setItemRows([]);
    setError(null);
  }

  function addItemRow() {
    const used = new Set(itemRows.map((r) => r.materialId));
    const next = materials.find((m) => !used.has(m.id));
    setItemRows((rows) => [...rows, { materialId: next?.id ?? "", qty: "1" }]);
  }

  function updateItemRow(index: number, patch: Partial<ItemRow>) {
    setItemRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeItemRow(index: number) {
    setItemRows((rows) => rows.filter((_, i) => i !== index));
  }

  function availableOptionsFor(currentMaterialId: string) {
    const usedElsewhere = new Set(itemRows.filter((r) => r.materialId !== currentMaterialId).map((r) => r.materialId));
    return materials.filter((m) => !usedElsewhere.has(m.id));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Nama template wajib diisi.");
      return;
    }
    for (const row of itemRows) {
      const qty = Number(row.qty);
      if (!row.materialId || !Number.isFinite(qty) || qty < 1) {
        setError("Setiap baris material wajib memilih material dengan kuantitas minimal 1.");
        return;
      }
    }

    const items: BomTemplateItem[] = itemRows.map((r) => ({ materialId: r.materialId, qty: Number(r.qty) }));
    const payload = { name: form.name.trim(), description: form.description.trim() || undefined, items };

    setSubmitting(true);
    const result = editingId ? await updateBomTemplate(editingId, payload) : await createBomTemplate(payload);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    showToast(editingId ? `Template "${payload.name}" berhasil diperbarui.` : `Template "${payload.name}" berhasil dibuat.`);
    closeFormModal();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const result = await deleteBomTemplate(deleteTarget.id);
    if (!result.ok) {
      showToast(result.error, "error");
      setDeleteTarget(null);
      return;
    }
    showToast(`Template "${deleteTarget.name}" berhasil dihapus.`);
    setDeleteTarget(null);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Template BOM</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {templates.length} template tersimpan — bisa dimuat langsung ke form Proyek Booth baru.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: GRADIENT }}
        >
          <Plus className="h-4 w-4" />
          Buat Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <EmptyState
            icon={ClipboardList}
            title="Belum ada template BOM"
            description='Klik "Buat Template" untuk menyimpan resep alokasi material tipe booth yang sering dipakai.'
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-zinc-900 dark:text-white">{t.name}</p>
                  {t.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">{t.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(t)}
                    aria-label={`Edit template ${t.name}`}
                    className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(t)}
                    aria-label={`Hapus template ${t.name}`}
                    className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                {t.items.length === 0 && <li className="text-zinc-300 dark:text-zinc-600">Belum ada material.</li>}
                {t.items.map((item) => (
                  <li key={item.materialId} className="flex justify-between gap-2">
                    <span className="truncate">{materialName(item.materialId)}</span>
                    <span className="shrink-0 font-medium text-zinc-700 dark:text-zinc-300">{item.qty}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={closeFormModal}
        title={editingId ? "Edit Template BOM" : "Buat Template BOM Baru"}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="bom-template-name" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Nama Template
            </label>
            <input
              id="bom-template-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="mis. Booth 3x3 Standar"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-amber-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="bom-template-desc" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Deskripsi (opsional)
            </label>
            <input
              id="bom-template-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="mis. Untuk booth pameran ukuran kecil tanpa panggung"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-amber-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Material</label>
              <button
                type="button"
                onClick={addItemRow}
                disabled={itemRows.length >= materials.length}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-amber-400"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Material
              </button>
            </div>

            {itemRows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-black/10 px-3.5 py-3 text-xs text-zinc-400 dark:border-white/10">
                Belum ada material di template ini.
              </p>
            ) : (
              <div className="space-y-2">
                {itemRows.map((row, index) => {
                  const options = availableOptionsFor(row.materialId);
                  return (
                    <div key={index} className="flex items-start gap-2">
                      <select
                        value={row.materialId}
                        onChange={(e) => updateItemRow(index, { materialId: e.target.value })}
                        className="min-w-0 flex-1 rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-amber-500/40 focus:ring-2 dark:border-white/10 dark:text-white dark:[&>option]:bg-zinc-900"
                      >
                        <option value="">Pilih material…</option>
                        {options.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={row.qty}
                        onChange={(e) => updateItemRow(index, { qty: e.target.value })}
                        className="w-24 shrink-0 rounded-xl border border-black/10 bg-transparent px-3 py-2.5 text-sm text-zinc-900 outline-none ring-amber-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        title="Hapus baris"
                        aria-label="Hapus baris"
                        className="mt-1.5 shrink-0 rounded-full p-1 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
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
              {submitting ? "Menyimpan…" : editingId ? "Simpan Perubahan" : "Buat Template"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Hapus Template BOM"
        description={
          deleteTarget && (
            <>
              Yakin hapus template <strong>{deleteTarget.name}</strong>? Tindakan ini tidak bisa dibatalkan.
            </>
          )
        }
      />
    </div>
  );
}
