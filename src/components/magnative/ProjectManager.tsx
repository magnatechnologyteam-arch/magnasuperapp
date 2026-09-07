"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Briefcase, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMagnativeData } from "./MagnativeDataProvider";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { formatDateID, formatRupiah } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";
import type { Project, ProjectStatus, ProjectType } from "@/lib/magnative/types";

const GRADIENT = "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)";

const STATUS_STYLES: Record<ProjectStatus, string> = {
  Perencanaan: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Berjalan: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Selesai: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Dibatalkan: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

const ALL_TYPES: ProjectType[] = ["Event Organizer", "Creative Agency", "Media Sosial", "Lainnya"];
const ALL_STATUSES: ProjectStatus[] = ["Perencanaan", "Berjalan", "Selesai", "Dibatalkan"];
const ALL_FILTER = "Semua Status";

function emptyForm() {
  return {
    clientId: "",
    name: "",
    type: "Event Organizer" as ProjectType,
    tanggalMulai: "",
    tanggalSelesai: "",
    budget: "0",
    status: "Perencanaan" as ProjectStatus,
    catatan: "",
  };
}

function projectToForm(p: Project) {
  return {
    clientId: p.clientId,
    name: p.name,
    type: p.type,
    tanggalMulai: p.tanggalMulai,
    tanggalSelesai: p.tanggalSelesai,
    budget: String(p.budget),
    status: p.status,
    catatan: p.catatan ?? "",
  };
}

/**
 * Tracker proyek/event per klien — tabel + modal tambah/edit, dan
 * konfirmasi hapus. Proyek terhubung ke klien lewat `clientId`, jadi kalau
 * daftar klien berubah (tambah klien baru di tab Klien), dropdown di sini
 * langsung ikut update tanpa reload berkat MagnativeDataProvider yang sama.
 */
export function ProjectManager() {
  const { clients, projects, addProject, updateProject, deleteProject } = useMagnativeData();
  const { showToast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL_FILTER);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => b.tanggalMulai.localeCompare(a.tanggalMulai)),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return sortedProjects.filter((p) => {
      const matchesSearch =
        !term || p.name.toLowerCase().includes(term) || clientName(p.clientId).toLowerCase().includes(term);
      const matchesStatus = statusFilter === ALL_FILTER || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sortedProjects, searchTerm, statusFilter, clients]);

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setFormOpen(true);
  }

  function openEditModal(p: Project) {
    setEditingId(p.id);
    setForm(projectToForm(p));
    setError(null);
    setFormOpen(true);
  }

  function closeFormModal() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const budget = Number(form.budget);

    if (!form.clientId) {
      setError("Pilih klien untuk proyek ini.");
      return;
    }
    if (!form.name.trim()) {
      setError("Nama proyek wajib diisi.");
      return;
    }
    if (!form.tanggalMulai || !form.tanggalSelesai) {
      setError("Tanggal mulai dan selesai wajib diisi.");
      return;
    }
    if (form.tanggalMulai > form.tanggalSelesai) {
      setError("Tanggal mulai tidak boleh setelah tanggal selesai.");
      return;
    }
    if (!Number.isFinite(budget) || budget < 0) {
      setError("Budget tidak valid.");
      return;
    }

    const payload = {
      clientId: form.clientId,
      name: form.name.trim(),
      type: form.type,
      tanggalMulai: form.tanggalMulai,
      tanggalSelesai: form.tanggalSelesai,
      budget,
      status: form.status,
      catatan: form.catatan.trim() || undefined,
    };

    if (editingId) {
      updateProject(editingId, payload);
      showToast(`Proyek "${payload.name}" berhasil diperbarui.`);
    } else {
      addProject(payload);
      showToast(`Proyek "${payload.name}" berhasil dibuat.`);
    }
    closeFormModal();
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteProject(deleteTarget.id);
    showToast(`Proyek "${deleteTarget.name}" berhasil dihapus.`);
    setDeleteTarget(null);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Daftar Proyek</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {filteredProjects.length} dari {projects.length} proyek ditampilkan
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          disabled={clients.length === 0}
          title={clients.length === 0 ? "Tambahkan klien terlebih dahulu di tab Klien" : undefined}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          style={{ background: GRADIENT }}
        >
          <Plus className="h-4 w-4" />
          Buat Proyek
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari proyek atau klien…"
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
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <th className="px-5 py-3">Proyek</th>
                <th className="px-5 py-3">Klien</th>
                <th className="px-5 py-3">Tipe</th>
                <th className="px-5 py-3">Mulai</th>
                <th className="px-5 py-3">Selesai</th>
                <th className="px-5 py-3 text-right">Budget</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-zinc-400">
                    {projects.length === 0 ? "Belum ada proyek." : "Tidak ada proyek yang cocok dengan pencarian/filter."}
                  </td>
                </tr>
              )}
              {filteredProjects.map((p) => (
                <tr key={p.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">
                    <span className="inline-flex items-center gap-2">
                      <Briefcase className="h-4 w-4 shrink-0 text-zinc-400" />
                      {p.name}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{clientName(p.clientId)}</td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{p.type}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                    {formatDateID(p.tanggalMulai)}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                    {formatDateID(p.tanggalSelesai)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {formatRupiah(p.budget)}
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLES[p.status])}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        title="Edit proyek"
                        className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-fuchsia-50 hover:text-fuchsia-600 dark:hover:bg-fuchsia-500/10 dark:hover:text-fuchsia-300"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                        title="Hapus proyek"
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

      <Modal open={formOpen} onClose={closeFormModal} title={editingId ? "Edit Proyek" : "Buat Proyek Baru"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Klien
            </label>
            <select
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
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Nama Proyek
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="mis. Product Launch App v2"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Tipe
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ProjectType }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:text-white dark:[&>option]:bg-zinc-900"
              >
                {ALL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProjectStatus }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:text-white dark:[&>option]:bg-zinc-900"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={form.tanggalMulai}
                onChange={(e) => setForm((f) => ({ ...f, tanggalMulai: e.target.value }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Tanggal Selesai
              </label>
              <input
                type="date"
                value={form.tanggalSelesai}
                onChange={(e) => setForm((f) => ({ ...f, tanggalSelesai: e.target.value }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Budget (Rp)
            </label>
            <input
              type="number"
              min={0}
              step={1_000_000}
              value={form.budget}
              onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Catatan (opsional)
            </label>
            <input
              value={form.catatan}
              onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
              placeholder="mis. lokasi acara, jumlah tamu"
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
              className="rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm"
              style={{ background: GRADIENT }}
            >
              {editingId ? "Simpan Perubahan" : "Buat Proyek"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Hapus Proyek"
        description={
          deleteTarget && (
            <>
              Yakin hapus proyek <strong>{deleteTarget.name}</strong>? Tindakan ini tidak bisa dibatalkan.
            </>
          )
        }
      />
    </div>
  );
}
