"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Building2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { addVendor, deleteVendor, updateVendor } from "@/lib/production/extras-actions";
import { VENDOR_CATEGORIES, type Vendor, type VendorCategory } from "@/lib/production/extras-types";

const GRADIENT = "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)";
const ALL_FILTER = "Semua Kategori";

function emptyForm() {
  return {
    name: "",
    category: VENDOR_CATEGORIES[0] as VendorCategory,
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    catatan: "",
  };
}

function vendorToForm(v: Vendor) {
  return {
    name: v.name,
    category: v.category,
    contactName: v.contactName ?? "",
    contactPhone: v.contactPhone ?? "",
    contactEmail: v.contactEmail ?? "",
    catatan: v.catatan ?? "",
  };
}

/**
 * Database vendor/supplier (Tahap 44 — gap #5 analisis-gap-production.md)
 * — master data kontak & kategori supplier, dipakai sebagai picker
 * opsional di form Purchase Order (`PurchaseOrderManager`) supaya tidak
 * ketik ulang nama & kontak tiap kali. `supplierName` di PO tetap teks
 * bebas — vendor yang belum terdaftar di sini tetap bisa dipakai.
 */
export function VendorManager({ vendors }: { vendors: Vendor[] }) {
  const { showToast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_FILTER);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return vendors.filter((v) => {
      const matchesSearch =
        !term ||
        v.name.toLowerCase().includes(term) ||
        (v.contactName ?? "").toLowerCase().includes(term);
      const matchesCategory = categoryFilter === ALL_FILTER || v.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [vendors, searchTerm, categoryFilter]);

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setFormOpen(true);
  }

  function openEditModal(v: Vendor) {
    setEditingId(v.id);
    setForm(vendorToForm(v));
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
      setError("Nama vendor wajib diisi.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      category: form.category,
      contactName: form.contactName.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      contactEmail: form.contactEmail.trim() || undefined,
      catatan: form.catatan.trim() || undefined,
    };

    setSubmitting(true);
    const result = editingId ? await updateVendor(editingId, payload) : await addVendor(payload);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    showToast(editingId ? `Vendor "${payload.name}" berhasil diperbarui.` : `Vendor "${payload.name}" berhasil ditambahkan.`);
    closeFormModal();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const result = await deleteVendor(deleteTarget.id);
    if (!result.ok) {
      showToast(result.error, "error");
      setDeleteTarget(null);
      return;
    }
    showToast(`Vendor "${deleteTarget.name}" berhasil dihapus.`);
    setDeleteTarget(null);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Database Vendor/Supplier</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {filtered.length} dari {vendors.length} vendor ditampilkan — bisa dipakai langsung saat buat PO.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: GRADIENT }}
        >
          <Plus className="h-4 w-4" />
          Tambah Vendor
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama vendor atau kontak…"
            className="w-full rounded-full border border-black/10 bg-white py-2 pl-9 pr-3.5 text-sm text-zinc-900 outline-none ring-amber-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-sm text-zinc-700 outline-none ring-amber-500/40 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
        >
          <option>{ALL_FILTER}</option>
          {VENDOR_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <th className="px-5 py-3">Vendor</th>
                <th className="px-5 py-3">Kategori</th>
                <th className="px-5 py-3">Kontak</th>
                <th className="px-5 py-3">Catatan</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={Building2}
                      title={vendors.length === 0 ? "Belum ada vendor terdaftar" : "Tidak ada hasil"}
                      description={
                        vendors.length === 0
                          ? 'Klik "Tambah Vendor" untuk mulai mencatat kontak & kategori supplier.'
                          : "Coba ubah kata kunci pencarian atau filter kategori."
                      }
                    />
                  </td>
                </tr>
              )}
              {filtered.map((v) => (
                <tr key={v.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                  <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{v.name}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{v.category}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">
                    {v.contactName || v.contactPhone || v.contactEmail ? (
                      <div className="space-y-0.5 text-xs">
                        {v.contactName && <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{v.contactName}</p>}
                        {v.contactPhone && <p>{v.contactPhone}</p>}
                        {v.contactEmail && <p>{v.contactEmail}</p>}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="max-w-[220px] truncate px-5 py-3 text-zinc-500 dark:text-zinc-400">
                    {v.catatan || "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(v)}
                        title="Edit vendor"
                        aria-label={`Edit vendor ${v.name}`}
                        className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(v)}
                        title="Hapus vendor"
                        aria-label={`Hapus vendor ${v.name}`}
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

      <Modal open={formOpen} onClose={closeFormModal} title={editingId ? "Edit Vendor" : "Tambah Vendor Baru"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="vendor-name" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Nama Vendor
            </label>
            <input
              id="vendor-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="mis. Toko Bangunan Jaya Abadi"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-amber-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="vendor-category" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Kategori
            </label>
            <select
              id="vendor-category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as VendorCategory }))}
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-amber-500/40 focus:ring-2 dark:border-white/10 dark:text-white dark:[&>option]:bg-zinc-900"
            >
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="vendor-contact-name" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Nama Kontak (opsional)
              </label>
              <input
                id="vendor-contact-name"
                value={form.contactName}
                onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                placeholder="mis. Pak Budi"
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-amber-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="vendor-contact-phone" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Telepon (opsional)
              </label>
              <input
                id="vendor-contact-phone"
                value={form.contactPhone}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                placeholder="08xxxxxxxxxx"
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-amber-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="vendor-contact-email" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Email (opsional)
            </label>
            <input
              id="vendor-contact-email"
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
              placeholder="mis. sales@vendor.com"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-amber-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="vendor-catatan" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Catatan (opsional)
            </label>
            <textarea
              id="vendor-catatan"
              value={form.catatan}
              onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
              rows={2}
              placeholder="mis. riwayat harga, lead time pengiriman"
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
              {submitting ? "Menyimpan…" : editingId ? "Simpan Perubahan" : "Tambah Vendor"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Hapus Vendor"
        description={
          deleteTarget && (
            <>
              Yakin hapus vendor <strong>{deleteTarget.name}</strong>? Riwayat PO yang sudah tertaut tidak ikut terhapus.
            </>
          )
        }
      />
    </div>
  );
}
