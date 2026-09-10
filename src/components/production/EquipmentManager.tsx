"use client";

import { useMemo, useState, type FormEvent } from "react";
import { History, Pencil, Plus, Search, Trash2, Wrench } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/cn";
import { EQUIPMENT_CONDITION_STYLES } from "@/lib/status-styles";
import { addEquipment, deleteEquipment, updateEquipment } from "@/lib/production/extras-actions";
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CONDITIONS,
  type Equipment,
  type EquipmentCategory,
  type EquipmentCondition,
} from "@/lib/production/extras-types";
import { EquipmentUsageModal } from "./EquipmentUsageModal";

const GRADIENT = "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)";
const CATEGORY_FILTER_ALL = "Semua Kategori";

function emptyForm() {
  return { name: "", kategori: "Alat Berat" as EquipmentCategory, kondisi: "Baik" as EquipmentCondition, catatan: "" };
}

function equipmentToForm(e: Equipment) {
  return { name: e.name, kategori: e.kategori, kondisi: e.kondisi, catatan: e.catatan ?? "" };
}

/**
 * Registry alat berat/perkakas (Tahap 28c) — tabel + modal tambah/edit
 * mirip persis `MaterialManager`, tapi tanpa stok/harga (alat berat/perkakas
 * bukan barang konsumsi yang habis dipakai). Riwayat pemakaian per alat
 * dibuka lewat tombol baru (`History`) yang menampilkan `EquipmentUsageModal`.
 * `equipment` datang sebagai props dari Server Component induk — sengaja
 * TIDAK ditaruh di `ProductionDataProvider` (lihat komentar di
 * `alat/page.tsx`), jadi daftar ter-refresh otomatis lewat `revalidatePath`
 * di tiap Server Action, sama seperti pola `ContentRequestManager`.
 */
export function EquipmentManager({ equipment }: { equipment: Equipment[] }) {
  const { showToast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null);
  const [usageTarget, setUsageTarget] = useState<Equipment | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>(CATEGORY_FILTER_ALL);

  const filteredEquipment = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return equipment.filter((eq) => {
      const matchesSearch = !term || eq.name.toLowerCase().includes(term);
      const matchesCategory = categoryFilter === CATEGORY_FILTER_ALL || eq.kategori === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [equipment, searchTerm, categoryFilter]);

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setFormOpen(true);
  }

  function openEditModal(eq: Equipment) {
    setEditingId(eq.id);
    setForm(equipmentToForm(eq));
    setError(null);
    setFormOpen(true);
  }

  function closeFormModal() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Nama alat wajib diisi.");
      return;
    }

    const payload = { name: form.name.trim(), kategori: form.kategori, kondisi: form.kondisi, catatan: form.catatan.trim() || undefined };

    setSubmitting(true);
    const result = editingId ? await updateEquipment(editingId, payload) : await addEquipment(payload);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    showToast(editingId ? `"${payload.name}" berhasil diperbarui.` : `"${payload.name}" berhasil ditambahkan.`);
    closeFormModal();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const result = await deleteEquipment(deleteTarget.id);
    if (!result.ok) {
      showToast(result.error, "error");
      setDeleteTarget(null);
      return;
    }
    showToast(`"${deleteTarget.name}" berhasil dihapus.`);
    setDeleteTarget(null);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Alat & Perkakas</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {filteredEquipment.length} dari {equipment.length} alat ditampilkan
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: GRADIENT }}
        >
          <Plus className="h-4 w-4" />
          Tambah Alat
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama alat…"
            className="w-full rounded-full border border-black/10 bg-white py-2 pl-9 pr-3.5 text-sm text-zinc-900 outline-none ring-amber-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-sm text-zinc-700 outline-none ring-amber-500/40 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
        >
          <option>{CATEGORY_FILTER_ALL}</option>
          {EQUIPMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <th className="px-5 py-3">Alat</th>
                <th className="px-5 py-3">Kategori</th>
                <th className="px-5 py-3">Kondisi</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredEquipment.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <EmptyState
                      icon={Wrench}
                      title={equipment.length === 0 ? "Belum ada alat terdaftar" : "Tidak ada hasil"}
                      description={
                        equipment.length === 0
                          ? "Klik \"Tambah Alat\" untuk mulai mendaftarkan alat berat/perkakas."
                          : "Coba ubah kata kunci pencarian atau filter kategori."
                      }
                    />
                  </td>
                </tr>
              )}
              {filteredEquipment.map((eq) => (
                <tr key={eq.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">
                    <span className="inline-flex items-center gap-2">
                      <Wrench className="h-4 w-4 shrink-0 text-zinc-400" />
                      {eq.name}
                    </span>
                    {eq.catatan && <p className="mt-0.5 pl-6 text-xs text-zinc-400 dark:text-zinc-500">{eq.catatan}</p>}
                  </td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{eq.kategori}</td>
                  <td className="px-5 py-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", EQUIPMENT_CONDITION_STYLES[eq.kondisi])}>
                      {eq.kondisi}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setUsageTarget(eq)}
                        title="Riwayat pemakaian"
                        aria-label="Riwayat pemakaian"
                        className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-500/10 dark:hover:text-sky-300"
                      >
                        <History className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(eq)}
                        title="Edit alat"
                        aria-label="Edit alat"
                        className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(eq)}
                        title="Hapus alat"
                        aria-label="Hapus alat"
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

      <Modal open={formOpen} onClose={closeFormModal} title={editingId ? "Edit Alat" : "Tambah Alat Baru"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="equipment-name" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Nama Alat
            </label>
            <input
              id="equipment-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="mis. Genset 5000 Watt"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-amber-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="equipment-kategori" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Kategori
              </label>
              <select
                id="equipment-kategori"
                value={form.kategori}
                onChange={(e) => setForm((f) => ({ ...f, kategori: e.target.value as EquipmentCategory }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-amber-500/40 focus:ring-2 dark:border-white/10 dark:text-white dark:[&>option]:bg-zinc-900"
              >
                {EQUIPMENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="equipment-kondisi" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Kondisi
              </label>
              <select
                id="equipment-kondisi"
                value={form.kondisi}
                onChange={(e) => setForm((f) => ({ ...f, kondisi: e.target.value as EquipmentCondition }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-amber-500/40 focus:ring-2 dark:border-white/10 dark:text-white dark:[&>option]:bg-zinc-900"
              >
                {EQUIPMENT_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="equipment-catatan" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Catatan (opsional)
            </label>
            <input
              id="equipment-catatan"
              value={form.catatan}
              onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
              placeholder="mis. simpan di gudang belakang"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-amber-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
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
              {submitting ? "Menyimpan…" : editingId ? "Simpan Perubahan" : "Simpan Alat"}
            </button>
          </div>
        </form>
      </Modal>

      {usageTarget && (
        <EquipmentUsageModal
          equipmentId={usageTarget.id}
          equipmentName={usageTarget.name}
          open={usageTarget !== null}
          onClose={() => setUsageTarget(null)}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Hapus Alat"
        description={
          deleteTarget && (
            <>
              Yakin hapus <strong>{deleteTarget.name}</strong>? Riwayat pemakaiannya akan ikut terhapus. Tindakan ini
              tidak bisa dibatalkan.
            </>
          )
        }
      />
    </div>
  );
}
