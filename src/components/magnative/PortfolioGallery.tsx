"use client";

import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { Camera, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { addPortfolioPhoto, deletePortfolioPhoto, updatePortfolioPhoto } from "@/lib/magnative/actions";
import type { PortfolioPhoto } from "@/lib/magnative/types";

const GRADIENT = "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)";

/**
 * Galeri portofolio Magnativ — pengganti PlaceholderGallery statis. Staf
 * bisa menambah foto (upload ke Supabase Storage lewat `addPortfolioPhoto`,
 * yang menerima FormData supaya bisa membawa `File`), mengedit judul/
 * keterangan, dan menghapus foto. Server Component induk (`page.tsx`)
 * meneruskan daftar foto sebagai props; `revalidatePath` di tiap action
 * membuat daftar ini otomatis ter-refresh setelah mutasi.
 */
export function PortfolioGallery({ photos }: { photos: PortfolioPhoto[] }) {
  const { showToast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [addTitle, setAddTitle] = useState("");
  const [addCaption, setAddCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editTarget, setEditTarget] = useState<PortfolioPhoto | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<PortfolioPhoto | null>(null);
  const [deleting, setDeleting] = useState(false);

  function closeAddModal() {
    setAddOpen(false);
    setPreviewUrl(null);
    setAddTitle("");
    setAddCaption("");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange() {
    const file = fileInputRef.current?.files?.[0];
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  async function handleAddSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Pilih foto terlebih dahulu.");
      return;
    }
    if (!addTitle.trim()) {
      setError("Judul foto wajib diisi.");
      return;
    }

    const formData = new FormData();
    formData.set("photo", file);
    formData.set("title", addTitle.trim());
    formData.set("caption", addCaption.trim());

    setSubmitting(true);
    const result = await addPortfolioPhoto(formData);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    showToast(`Foto "${addTitle.trim()}" berhasil ditambahkan.`);
    closeAddModal();
  }

  function openEditModal(photo: PortfolioPhoto) {
    setEditTarget(photo);
    setEditTitle(photo.title);
    setEditCaption(photo.caption ?? "");
    setEditError(null);
  }

  async function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTarget) return;
    if (!editTitle.trim()) {
      setEditError("Judul foto wajib diisi.");
      return;
    }

    setEditSubmitting(true);
    const result = await updatePortfolioPhoto(editTarget.id, {
      title: editTitle.trim(),
      caption: editCaption.trim() || undefined,
    });
    setEditSubmitting(false);

    if (!result.ok) {
      setEditError(result.error);
      return;
    }
    showToast("Keterangan foto berhasil diperbarui.");
    setEditTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deletePortfolioPhoto(deleteTarget.id);
    setDeleting(false);

    if (!result.ok) {
      showToast(result.error, "error");
      setDeleteTarget(null);
      return;
    }
    showToast(`Foto "${deleteTarget.title}" berhasil dihapus.`);
    setDeleteTarget(null);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Portofolio</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Dokumentasi event, konten, dan showcase klien Magnativ.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: GRADIENT }}
        >
          <Plus className="h-4 w-4" />
          Tambah Foto
        </button>
      </div>

      {photos.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <EmptyState
            icon={Camera}
            title="Belum ada foto portofolio"
            description='Klik "Tambah Foto" untuk mengunggah dokumentasi event atau konten pertama.'
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <figure
              key={photo.id}
              className="group overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900"
            >
              <div className="relative aspect-video w-full overflow-hidden">
                <Image
                  src={photo.photoUrl}
                  alt={photo.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => openEditModal(photo)}
                    title="Edit keterangan"
                    className="rounded-full bg-white/90 p-1.5 text-zinc-600 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-fuchsia-600 dark:bg-zinc-900/90 dark:text-zinc-300"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(photo)}
                    title="Hapus foto"
                    className="rounded-full bg-white/90 p-1.5 text-zinc-600 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-rose-600 dark:bg-zinc-900/90 dark:text-zinc-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <figcaption className="p-3">
                <p className="text-xs font-bold text-zinc-900 dark:text-white">{photo.title}</p>
                {photo.caption && (
                  <p className="mt-0.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                    {photo.caption}
                  </p>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={closeAddModal} title="Tambah Foto Portofolio">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Foto</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 file:mr-3 file:rounded-full file:border-0 file:bg-fuchsia-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-fuchsia-700 focus:ring-2 dark:border-white/10 dark:text-white dark:file:bg-fuchsia-500/10 dark:file:text-fuchsia-300"
            />
            {previewUrl && (
              <div className="relative mt-2.5 aspect-video w-full overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal dari blob: URL, next/image tidak perlu untuk ini */}
                <img src={previewUrl} alt="Pratinjau foto" className="h-full w-full object-cover" />
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Judul</label>
            <input
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              placeholder="mis. Dokumentasi Gala Dinner Amal"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Keterangan (opsional)
            </label>
            <input
              value={addCaption}
              onChange={(e) => setAddCaption(e.target.value)}
              placeholder="mis. panggung utama, momen highlight acara"
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
              onClick={closeAddModal}
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
              {submitting ? "Mengunggah…" : "Simpan Foto"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={editTarget !== null} onClose={() => setEditTarget(null)} title="Edit Keterangan Foto">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editTarget && (
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
              <Image src={editTarget.photoUrl} alt={editTarget.title} fill className="object-cover" />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Judul</label>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Keterangan (opsional)
            </label>
            <input
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-fuchsia-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>

          {editError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
              {editError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditTarget(null)}
              className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={editSubmitting}
              className="rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              style={{ background: GRADIENT }}
            >
              {editSubmitting ? "Menyimpan…" : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Hapus Foto"
        description={
          deleteTarget && (
            <>
              Yakin hapus foto <strong>{deleteTarget.title}</strong>? Tindakan ini tidak bisa dibatalkan.
              {deleting && " Menghapus…"}
            </>
          )
        }
      />
    </div>
  );
}
