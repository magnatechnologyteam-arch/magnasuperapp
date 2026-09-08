"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { useMagnativeData } from "./MagnativeDataProvider";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { getAvatarColor, getInitials } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";
import type { Client, ClientStatus } from "@/lib/magnative/types";

const GRADIENT = "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)";

const STATUS_STYLES: Record<ClientStatus, string> = {
  Prospek: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Aktif: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Selesai: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
  "Tidak Lanjut": "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

const ALL_STATUSES: ClientStatus[] = ["Prospek", "Aktif", "Selesai", "Tidak Lanjut"];
const ALL_FILTER = "Semua Status";

const EMPTY_FORM = {
  name: "",
  industry: "",
  picName: "",
  picPhone: "",
  picEmail: "",
  status: "Prospek" as ClientStatus,
  catatan: "",
};

function clientToForm(c: Client) {
  return {
    name: c.name,
    industry: c.industry,
    picName: c.picName,
    picPhone: c.picPhone ?? "",
    picEmail: c.picEmail ?? "",
    status: c.status,
    catatan: c.catatan ?? "",
  };
}

/**
 * CRM ringan: daftar klien EO/creative agency + modal tambah/edit, dan
 * konfirmasi hapus. Menghapus klien yang masih punya proyek aktif
 * (Perencanaan/Berjalan) diblokir — sama seperti guard hapus alat di
 * Magnarent — supaya proyek tidak jadi "yatim" menunjuk klien yang hilang.
 */
export function ClientManager() {
  const { clients, addClient, updateClient, deleteClient, getActiveProjectsForClient } = useMagnativeData();
  const { showToast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL_FILTER);

  const filteredClients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return clients.filter((c) => {
      const matchesSearch =
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.picName.toLowerCase().includes(term) ||
        c.industry.toLowerCase().includes(term);
      const matchesStatus = statusFilter === ALL_FILTER || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, searchTerm, statusFilter]);

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setFormOpen(true);
  }

  function openEditModal(c: Client) {
    setEditingId(c.id);
    setForm(clientToForm(c));
    setError(null);
    setFormOpen(true);
  }

  function closeFormModal() {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!form.name.trim() || !form.industry.trim() || !form.picName.trim()) {
      setError("Nama klien, industri, dan nama PIC wajib diisi.");
      return;
    }
    if (form.picEmail.trim() && !form.picEmail.includes("@")) {
      setError("Format email PIC tidak valid.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      industry: form.industry.trim(),
      picName: form.picName.trim(),
      picPhone: form.picPhone.trim() || undefined,
      picEmail: form.picEmail.trim() || undefined,
      status: form.status,
      catatan: form.catatan.trim() || undefined,
    };

    setSubmitting(true);
    const result = editingId ? await updateClient(editingId, payload) : await addClient(payload);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    showToast(editingId ? `Klien "${payload.name}" berhasil diperbarui.` : `Klien "${payload.name}" berhasil ditambahkan.`);
    closeFormModal();
  }

  const activeProjectsForDeleteTarget = deleteTarget ? getActiveProjectsForClient(deleteTarget.id) : [];
  const deleteBlocked = activeProjectsForDeleteTarget.length > 0;

  async function confirmDelete() {
    if (!deleteTarget || deleteBlocked) return;
    const result = await deleteClient(deleteTarget.id);
    if (!result.ok) {
      showToast(result.error, "error");
      setDeleteTarget(null);
      return;
    }
    showToast(`Klien "${deleteTarget.name}" berhasil dihapus.`);
    setDeleteTarget(null);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Daftar Klien</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {filteredClients.length} dari {clients.length} klien ditampilkan
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: GRADIENT }}
        >
          <Plus className="h-4 w-4" />
          Tambah Klien
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari klien, PIC, atau industri…"
            className="w-full rounded-full border border-black/10 bg-white py-2 pl-9 pr-3.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-sm text-zinc-700 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
        >
          <option>{ALL_FILTER}</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <th className="px-5 py-3">Klien</th>
                <th className="px-5 py-3">Industri</th>
                <th className="px-5 py-3">PIC</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={Users}
                      title={clients.length === 0 ? "Belum ada klien terdaftar" : "Tidak ada hasil"}
                      description={
                        clients.length === 0
                          ? "Klik \"Tambah Klien\" untuk mulai membangun daftar klien."
                          : "Coba ubah kata kunci pencarian atau filter status."
                      }
                    />
                  </td>
                </tr>
              )}
              {filteredClients.map((c) => (
                <tr key={c.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white",
                          getAvatarColor(c.name)
                        )}
                      >
                        {getInitials(c.name)}
                      </span>
                      <p className="font-medium text-zinc-900 dark:text-white">{c.name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{c.industry}</td>
                  <td className="px-5 py-3">
                    <p className="text-zinc-700 dark:text-zinc-300">{c.picName}</p>
                    {(c.picPhone || c.picEmail) && (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        {[c.picPhone, c.picEmail].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLES[c.status])}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        title="Edit klien"
                        className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-fuchsia-50 hover:text-fuchsia-600 dark:hover:bg-fuchsia-500/10 dark:hover:text-fuchsia-300"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(c)}
                        title="Hapus klien"
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

      <Modal open={formOpen} onClose={closeFormModal} title={editingId ? "Edit Klien" : "Tambah Klien Baru"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Nama Klien
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="mis. PT Nusantara Digital"
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Industri
              </label>
              <input
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                placeholder="mis. Teknologi"
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Nama PIC
            </label>
            <input
              value={form.picName}
              onChange={(e) => setForm((f) => ({ ...f, picName: e.target.value }))}
              placeholder="mis. Rangga Prasetyo"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Telepon PIC (opsional)
              </label>
              <input
                value={form.picPhone}
                onChange={(e) => setForm((f) => ({ ...f, picPhone: e.target.value }))}
                placeholder="0812-xxxx-xxxx"
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Email PIC (opsional)
              </label>
              <input
                value={form.picEmail}
                onChange={(e) => setForm((f) => ({ ...f, picEmail: e.target.value }))}
                placeholder="nama@perusahaan.com"
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ClientStatus }))}
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:text-white dark:[&>option]:bg-zinc-900"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Catatan (opsional)
            </label>
            <input
              value={form.catatan}
              onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
              placeholder="mis. preferensi komunikasi, riwayat kerja sama"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
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
              {submitting ? "Menyimpan…" : editingId ? "Simpan Perubahan" : "Simpan Klien"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Hapus Klien"
        blocked={deleteBlocked}
        blockedMessage={
          deleteTarget && (
            <>
              <strong>{deleteTarget.name}</strong> tidak bisa dihapus — masih ada{" "}
              {activeProjectsForDeleteTarget.length} proyek aktif:
              <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                {activeProjectsForDeleteTarget.map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))}
              </ul>
              Selesaikan atau batalkan proyek tersebut lebih dulu.
            </>
          )
        }
        description={
          deleteTarget && (
            <>
              Yakin hapus <strong>{deleteTarget.name}</strong>? Tindakan ini tidak bisa dibatalkan.
            </>
          )
        }
      />
    </div>
  );
}
