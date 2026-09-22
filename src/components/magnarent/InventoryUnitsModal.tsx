"use client";

import { Fragment, useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Printer, QrCode, Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/cn";
import {
  addInventoryUnit,
  deleteInventoryUnit,
  getInventoryUnits,
  updateInventoryUnit,
} from "@/lib/magnarent/extras-actions";
import type { InventoryUnit, InventoryUnitStatus } from "@/lib/magnarent/types";
import type { InventoryItem } from "@/lib/magnarent/types";

const ALL_STATUSES: InventoryUnitStatus[] = ["Tersedia", "Dipinjam", "Maintenance", "Hilang"];

const STATUS_STYLE: Record<InventoryUnitStatus, string> = {
  Tersedia: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
  Dipinjam: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
  Maintenance: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
  Hilang: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
};

function emptyForm(nextCode: string) {
  return { kodeUnit: nextCode, status: "Tersedia" as InventoryUnitStatus, catatan: "" };
}

/** Saran kode unit berikutnya, mis. "TND-01", "TND-02" — murni bantuan pengisian, staf tetap bisa ganti manual. */
function suggestNextCode(itemName: string, existing: InventoryUnit[]): string {
  const prefix = itemName
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 4) || "UNIT";
  return `${prefix}-${String(existing.length + 1).padStart(2, "0")}`;
}

/**
 * Unit individual per alat + label QR (Gap #2/#3 analisis gap Magnarent) —
 * dibuka dari tombol QR baru di InventoryManager.tsx. Data on-demand per
 * alat (sama pola dengan MaintenanceLogModal), TIDAK ikut memengaruhi
 * hitungan kapasitas booking (tetap murni jumlah, lihat availability.ts) —
 * ini murni lapisan identifikasi fisik buat staf gudang scan QR.
 */
export function InventoryUnitsModal({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const { showToast } = useToast();
  const [units, setUnits] = useState<InventoryUnit[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm(""));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InventoryUnit | null>(null);
  const [printTarget, setPrintTarget] = useState<InventoryUnit | null>(null);

  function reload() {
    getInventoryUnits(item.id).then(setUnits);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm(suggestNextCode(item.name, units ?? [])));
    setError(null);
    setFormOpen(true);
  }

  function openEditForm(unit: InventoryUnit) {
    setEditingId(unit.id);
    setForm({ kodeUnit: unit.kodeUnit, status: unit.status, catatan: unit.catatan ?? "" });
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.kodeUnit.trim()) {
      setError("Kode unit wajib diisi.");
      return;
    }
    setSubmitting(true);
    const payload = { kodeUnit: form.kodeUnit.trim(), status: form.status, catatan: form.catatan };
    const result = editingId
      ? await updateInventoryUnit(editingId, payload)
      : await addInventoryUnit(item.id, payload);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    showToast(editingId ? "Unit berhasil diperbarui." : "Unit berhasil ditambahkan.");
    setFormOpen(false);
    reload();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const result = await deleteInventoryUnit(deleteTarget.id);
    if (!result.ok) {
      showToast(result.error, "error");
      setDeleteTarget(null);
      return;
    }
    showToast(`Unit "${deleteTarget.kodeUnit}" berhasil dihapus.`);
    setDeleteTarget(null);
    reload();
  }

  function handlePrint() {
    window.print();
  }

  return (
    <Fragment>
    <Modal open onClose={onClose} title={`Unit & QR — ${item.name}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {units?.length ?? 0} unit tercatat · {item.totalUnit} total unit di data alat
          </p>
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Unit
          </button>
        </div>

        {formOpen && (
          <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-black/5 p-3.5 dark:border-white/10">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="unit-kode" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Kode Unit
                </label>
                <input
                  id="unit-kode"
                  value={form.kodeUnit}
                  onChange={(e) => setForm((f) => ({ ...f, kodeUnit: e.target.value }))}
                  placeholder="mis. TND-01"
                  className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2 text-sm text-zinc-900 outline-none ring-violet-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="unit-status" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Status
                </label>
                <select
                  id="unit-status"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as InventoryUnitStatus }))}
                  className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2 text-sm text-zinc-900 outline-none ring-violet-500/40 focus:ring-2 dark:border-white/10 dark:text-white dark:[&>option]:bg-zinc-900"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="unit-catatan" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Catatan (opsional)
              </label>
              <input
                id="unit-catatan"
                value={form.catatan}
                onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
                placeholder="mis. Ada goresan kecil di sisi kiri"
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2 text-sm text-zinc-900 outline-none ring-violet-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {submitting ? "Menyimpan…" : editingId ? "Simpan Perubahan" : "Tambah Unit"}
              </button>
            </div>
          </form>
        )}

        <div className="max-h-[420px] space-y-2 overflow-y-auto">
          {units === null && <p className="py-6 text-center text-sm text-zinc-400">Memuat…</p>}
          {units?.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-black/10 py-8 text-center dark:border-white/10">
              <QrCode className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Belum ada unit tercatat</p>
              <p className="text-xs text-zinc-400">Tambah unit pertama lewat tombol di atas.</p>
            </div>
          )}
          {units?.map((unit) => (
            <div
              key={unit.id}
              className="flex items-center gap-3 rounded-xl border border-black/5 p-3 dark:border-white/10"
            >
              <button
                type="button"
                onClick={() => setPrintTarget(unit)}
                title="Lihat/cetak label QR"
                className="shrink-0 rounded-lg border border-black/10 bg-white p-1.5 dark:border-white/10"
              >
                <QRCodeSVG value={unit.kodeUnit} size={36} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{unit.kodeUnit}</p>
                {unit.catatan && <p className="truncate text-xs text-zinc-400">{unit.catatan}</p>}
              </div>
              <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLE[unit.status])}>
                {unit.status}
              </span>
              <button
                type="button"
                onClick={() => openEditForm(unit)}
                aria-label="Edit unit"
                className="shrink-0 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-500/10 dark:hover:text-sky-300"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(unit)}
                aria-label="Hapus unit"
                className="shrink-0 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Hapus Unit"
        description={
          deleteTarget && (
            <>
              Yakin hapus unit <strong>{deleteTarget.kodeUnit}</strong>? Tindakan ini tidak bisa dibatalkan.
            </>
          )
        }
      />
    </Modal>

    {/* Sengaja modal terpisah (sibling), bukan bersarang di dalam Modal
       utama — `transform` di dialog utama bikin containing block baru buat
       elemen `position: fixed`, jadi modal bersarang bisa "kejebak" di
       dalam box modal utama alih-alih menutupi seluruh layar. */}
    {printTarget && (
      <Modal open onClose={() => setPrintTarget(null)} title={`Label QR — ${printTarget.kodeUnit}`}>
        <div className="flex flex-col items-center gap-4 py-4 print:py-0">
          <QRCodeSVG value={printTarget.kodeUnit} size={200} />
          <div className="text-center">
            <p className="text-lg font-bold text-zinc-900 dark:text-white">{printTarget.kodeUnit}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{item.name}</p>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white print:hidden"
          >
            <Printer className="h-4 w-4" />
            Cetak Label
          </button>
        </div>
      </Modal>
    )}
    </Fragment>
  );
}
