"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMagnativeData } from "./MagnativeDataProvider";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { formatDateID, todayISO } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";
import type { ContentPost, ContentStatus, Platform } from "@/lib/magnative/types";

const GRADIENT = "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)";

const STATUS_STYLES: Record<ContentStatus, string> = {
  Draft: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
  Review: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Terjadwal: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Tayang: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
};

const PLATFORM_STYLES: Record<Platform, string> = {
  Instagram: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
  TikTok: "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-200",
  Facebook: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  YouTube: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  LinkedIn: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Lainnya: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
};

const ALL_PLATFORMS: Platform[] = ["Instagram", "TikTok", "Facebook", "YouTube", "LinkedIn", "Lainnya"];
const ALL_STATUSES: ContentStatus[] = ["Draft", "Review", "Terjadwal", "Tayang"];
const ALL_FILTER = "Semua";

function emptyForm() {
  return {
    clientId: "",
    title: "",
    platform: "Instagram" as Platform,
    tanggalPosting: todayISO(),
    status: "Draft" as ContentStatus,
    catatan: "",
  };
}

function postToForm(p: ContentPost) {
  return {
    clientId: p.clientId ?? "",
    title: p.title,
    platform: p.platform,
    tanggalPosting: p.tanggalPosting,
    status: p.status,
    catatan: p.catatan ?? "",
  };
}

/**
 * Perencana konten sosial media — tabel jadwal posting + modal tambah/edit,
 * dan konfirmasi hapus. Konten bisa dikaitkan ke klien (opsional, untuk
 * konten yang dibuat atas nama klien) atau dibiarkan kosong untuk konten
 * internal Magna Technology sendiri.
 */
export function ContentPlanner() {
  const { clients, contentPosts, addContentPost, updateContentPost, deleteContentPost } = useMagnativeData();
  const { showToast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContentPost | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL_FILTER);
  const [platformFilter, setPlatformFilter] = useState<string>(ALL_FILTER);

  const clientName = (id?: string) => (id ? clients.find((c) => c.id === id)?.name ?? "—" : "Internal");

  const sortedPosts = useMemo(
    () => [...contentPosts].sort((a, b) => a.tanggalPosting.localeCompare(b.tanggalPosting)),
    [contentPosts]
  );

  const filteredPosts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return sortedPosts.filter((p) => {
      const matchesSearch = !term || p.title.toLowerCase().includes(term) || clientName(p.clientId).toLowerCase().includes(term);
      const matchesStatus = statusFilter === ALL_FILTER || p.status === statusFilter;
      const matchesPlatform = platformFilter === ALL_FILTER || p.platform === platformFilter;
      return matchesSearch && matchesStatus && matchesPlatform;
    });
  }, [sortedPosts, searchTerm, statusFilter, platformFilter, clients]);

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setFormOpen(true);
  }

  function openEditModal(p: ContentPost) {
    setEditingId(p.id);
    setForm(postToForm(p));
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

    if (!form.title.trim()) {
      setError("Judul/topik konten wajib diisi.");
      return;
    }
    if (!form.tanggalPosting) {
      setError("Tanggal posting wajib diisi.");
      return;
    }

    const payload = {
      clientId: form.clientId || undefined,
      title: form.title.trim(),
      platform: form.platform,
      tanggalPosting: form.tanggalPosting,
      status: form.status,
      catatan: form.catatan.trim() || undefined,
    };

    if (editingId) {
      updateContentPost(editingId, payload);
      showToast(`Konten "${payload.title}" berhasil diperbarui.`);
    } else {
      addContentPost(payload);
      showToast(`Konten "${payload.title}" berhasil ditambahkan.`);
    }
    closeFormModal();
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteContentPost(deleteTarget.id);
    showToast(`Konten "${deleteTarget.title}" berhasil dihapus.`);
    setDeleteTarget(null);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Perencana Konten</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {filteredPosts.length} dari {contentPosts.length} konten ditampilkan
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: GRADIENT }}
        >
          <Plus className="h-4 w-4" />
          Tambah Konten
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari judul konten atau klien…"
            className="w-full rounded-full border border-black/10 bg-white py-2 pl-9 pr-3.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
          />
        </div>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-sm text-zinc-700 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
        >
          <option value={ALL_FILTER}>Semua Platform</option>
          {ALL_PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-sm text-zinc-700 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
        >
          <option value={ALL_FILTER}>Semua Status</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <th className="px-5 py-3">Konten</th>
                <th className="px-5 py-3">Klien</th>
                <th className="px-5 py-3">Platform</th>
                <th className="px-5 py-3">Tanggal Posting</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-zinc-400">
                    {contentPosts.length === 0 ? "Belum ada konten terjadwal." : "Tidak ada konten yang cocok dengan pencarian/filter."}
                  </td>
                </tr>
              )}
              {filteredPosts.map((p) => (
                <tr key={p.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{p.title}</td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{clientName(p.clientId)}</td>
                  <td className="px-5 py-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", PLATFORM_STYLES[p.platform])}>
                      {p.platform}
                    </span>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                    {formatDateID(p.tanggalPosting)}
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
                        title="Edit konten"
                        className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-fuchsia-50 hover:text-fuchsia-600 dark:hover:bg-fuchsia-500/10 dark:hover:text-fuchsia-300"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                        title="Hapus konten"
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

      <Modal open={formOpen} onClose={closeFormModal} title={editingId ? "Edit Konten" : "Tambah Konten Baru"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Judul/Topik Konten
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="mis. Teaser Product Launch"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Klien (opsional — kosongkan untuk konten internal)
            </label>
            <select
              value={form.clientId}
              onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:text-white dark:[&>option]:bg-zinc-900"
            >
              <option value="">Internal (bukan atas nama klien)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Platform
              </label>
              <select
                value={form.platform}
                onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value as Platform }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:text-white dark:[&>option]:bg-zinc-900"
              >
                {ALL_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Tanggal Posting
              </label>
              <input
                type="date"
                value={form.tanggalPosting}
                onChange={(e) => setForm((f) => ({ ...f, tanggalPosting: e.target.value }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ContentStatus }))}
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
              Catatan/Caption (opsional)
            </label>
            <input
              value={form.catatan}
              onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
              placeholder="mis. draft caption, brief visual"
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
              {editingId ? "Simpan Perubahan" : "Simpan Konten"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Hapus Konten"
        description={
          deleteTarget && (
            <>
              Yakin hapus konten <strong>{deleteTarget.title}</strong>? Tindakan ini tidak bisa dibatalkan.
            </>
          )
        }
      />
    </div>
  );
}
