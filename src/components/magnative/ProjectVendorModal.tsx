"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Building2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMagnativeData } from "./MagnativeDataProvider";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRupiah } from "@/lib/shared/utils";
import type { Project, VendorCategory } from "@/lib/magnative/types";

const GRADIENT = "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)";

const ALL_CATEGORIES: VendorCategory[] = [
  "Venue",
  "Katering",
  "Dekorasi",
  "Sound System & Lighting",
  "Fotografi/Videografi",
  "Percetakan",
  "Lainnya",
];

function emptyLinkForm() {
  return { vendorId: "", keterangan: "", biayaEstimasi: "0" };
}

function emptyNewVendorForm() {
  return { name: "", category: "Lainnya" as VendorCategory, contactName: "", contactPhone: "" };
}

/**
 * Modal vendor per proyek (Update Opsional 2 — hasil gap analysis vs
 * aplikasi EO luar yang selalu punya basis data vendor, bukan cuma
 * catatan bebas di baris biaya). Staf bisa pilih vendor yang SUDAH ada di
 * basis data (`vendors`, lintas proyek), atau langsung tambah vendor baru
 * lewat form kecil yang bisa dibuka/tutup (`showNewVendor`) tanpa
 * meninggalkan modal ini. `biayaEstimasi` MURNI informatif (lihat komentar
 * `ProjectVendor` di types.ts) — biaya aktual tetap lewat tab Biaya Proyek.
 */
export function ProjectVendorModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const { vendors, getVendorLinksForProject, addVendor, addProjectVendor, updateProjectVendor, deleteProjectVendor } =
    useMagnativeData();
  const { showToast } = useToast();
  const [form, setForm] = useState(emptyLinkForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showNewVendor, setShowNewVendor] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState(emptyNewVendorForm);
  const [creatingVendor, setCreatingVendor] = useState(false);

  const links = getVendorLinksForProject(project.id);
  const vendorName = (id: string) => vendors.find((v) => v.id === id)?.name ?? "—";
  const totalEstimasi = useMemo(() => links.reduce((sum, l) => sum + l.biayaEstimasi, 0), [links]);
  const sortedVendors = useMemo(() => [...vendors].sort((a, b) => a.name.localeCompare(b.name)), [vendors]);

  function startEdit(id: string) {
    const target = links.find((l) => l.id === id);
    if (!target) return;
    setEditingId(id);
    setForm({
      vendorId: target.vendorId,
      keterangan: target.keterangan ?? "",
      biayaEstimasi: String(target.biayaEstimasi),
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyLinkForm());
    setError(null);
  }

  async function handleCreateVendor() {
    if (!newVendorForm.name.trim()) {
      setError("Nama vendor wajib diisi.");
      return;
    }
    setCreatingVendor(true);
    const result = await addVendor({
      name: newVendorForm.name.trim(),
      category: newVendorForm.category,
      contactName: newVendorForm.contactName.trim() || undefined,
      contactPhone: newVendorForm.contactPhone.trim() || undefined,
    });
    setCreatingVendor(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    showToast("Vendor baru berhasil ditambahkan ke basis data.");
    setNewVendorForm(emptyNewVendorForm());
    setShowNewVendor(false);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.vendorId) {
      setError("Pilih vendor terlebih dahulu (atau tambah vendor baru di atas).");
      return;
    }
    const biayaEstimasi = Number(form.biayaEstimasi) || 0;

    setSubmitting(true);
    const payload = {
      projectId: project.id,
      vendorId: form.vendorId,
      keterangan: form.keterangan.trim() || undefined,
      biayaEstimasi,
    };
    const result = editingId ? await updateProjectVendor(editingId, payload) : await addProjectVendor(payload);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setForm(emptyLinkForm());
    setEditingId(null);
    setError(null);
    showToast(editingId ? "Kaitan vendor berhasil diperbarui." : "Vendor berhasil dikaitkan ke proyek.");
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    const result = await deleteProjectVendor(id);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    if (editingId === id) cancelEdit();
    showToast("Kaitan vendor berhasil dilepas.");
  }

  return (
    <Modal open onClose={onClose} title={`Vendor Proyek — ${project.name}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 dark:bg-white/5">
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Total Estimasi Biaya Vendor</span>
          <span className="text-base font-bold text-zinc-900 dark:text-white">{formatRupiah(totalEstimasi)}</span>
        </div>

        {showNewVendor ? (
          <div className="space-y-2.5 rounded-xl border border-dashed border-violet-300 p-3 dark:border-violet-500/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Vendor Baru</span>
              <button type="button" onClick={() => setShowNewVendor(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              value={newVendorForm.name}
              onChange={(e) => setNewVendorForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nama vendor"
              className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newVendorForm.category}
                onChange={(e) => setNewVendorForm((f) => ({ ...f, category: e.target.value as VendorCategory }))}
                className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
              >
                {ALL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                value={newVendorForm.contactPhone}
                onChange={(e) => setNewVendorForm((f) => ({ ...f, contactPhone: e.target.value }))}
                placeholder="No. telepon (opsional)"
                className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={handleCreateVendor}
              disabled={creatingVendor}
              className="w-full rounded-lg py-2 text-xs font-semibold text-white disabled:opacity-60"
              style={{ background: GRADIENT }}
            >
              {creatingVendor ? "Menyimpan…" : "Simpan Vendor Baru"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNewVendor(true)}
            className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-300"
          >
            + Belum ada di daftar? Tambah vendor baru
          </button>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="pv-vendor" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Pilih Vendor
            </label>
            <select
              id="pv-vendor"
              value={form.vendorId}
              onChange={(e) => setForm((f) => ({ ...f, vendorId: e.target.value }))}
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
            >
              <option value="">— Pilih vendor —</option>
              {sortedVendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.category}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pv-ket" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Keterangan (opsional)
              </label>
              <input
                id="pv-ket"
                value={form.keterangan}
                onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
                placeholder="mis. Dekorasi panggung"
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="pv-estimasi" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Estimasi Biaya (Rp)
              </label>
              <input
                id="pv-estimasi"
                type="number"
                min={0}
                value={form.biayaEstimasi}
                onChange={(e) => setForm((f) => ({ ...f, biayaEstimasi: e.target.value }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
              >
                Batal
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              style={{ background: GRADIENT }}
            >
              {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {submitting ? "Menyimpan…" : editingId ? "Simpan Perubahan" : "Kaitkan Vendor"}
            </button>
          </div>
        </form>

        <div className="max-h-64 overflow-y-auto rounded-xl border border-black/5 dark:border-white/10">
          {links.length === 0 ? (
            <EmptyState icon={Building2} title="Belum ada vendor terkait" description="Kaitkan vendor pertama lewat form di atas." />
          ) : (
            <ul className="divide-y divide-black/5 dark:divide-white/5">
              {links.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{vendorName(l.vendorId)}</p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{l.keterangan || "—"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="mr-1 text-sm font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                      {formatRupiah(l.biayaEstimasi)}
                    </span>
                    <button
                      type="button"
                      onClick={() => (editingId === l.id ? cancelEdit() : startEdit(l.id))}
                      title={editingId === l.id ? "Batal edit" : "Edit kaitan"}
                      aria-label={editingId === l.id ? "Batal edit" : "Edit kaitan"}
                      className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/10 dark:hover:text-violet-300"
                    >
                      {editingId === l.id ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(l.id)}
                      disabled={busyId === l.id}
                      title="Lepas kaitan vendor"
                      aria-label="Lepas kaitan vendor"
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
