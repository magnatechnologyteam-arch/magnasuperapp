"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { formatRupiah } from "@/lib/shared/utils";
import { addImportSource, commitImportCandidates, deleteImportSource, previewImportSource } from "@/lib/products/import-actions";
import type { ExternalProductCandidate, ImportSourceType, ProductImportSource } from "@/lib/products/types";

const TYPE_LABEL: Record<ImportSourceType, string> = {
  whatsapp_catalog: "WhatsApp Catalog",
  website: "Website",
};

/**
 * Impor otomatis dari WhatsApp Business Catalog (Meta Graph API) & website
 * Magna lainnya (Tahap 29) — "perlu bisa diulang kapan saja" (permintaan
 * Owner), jadi ini komponen TERPISAH dari ProductManager: admin
 * mengonfigurasi daftar sumber sekali, lalu bisa klik "Sinkron Sekarang"
 * kapan pun tanpa perlu developer.
 *
 * Alur: Sinkron -> `previewImportSource` (server FETCH ke sumber
 * eksternal, TIDAK menyimpan apa-apa) -> admin centang produk mana yang
 * mau disimpan di layar review -> `commitImportCandidates` (baru di titik
 * ini data masuk ke Katalog Produk). Dipisah jadi dua langkah supaya
 * admin selalu bisa cek dulu sebelum data asing masuk ke database.
 */
export function ImportSourceManager({ sources }: { sources: ProductImportSource[] }) {
  const { showToast } = useToast();

  const [manageOpen, setManageOpen] = useState(false);
  const [addType, setAddType] = useState<ImportSourceType>("website");
  const [addLabel, setAddLabel] = useState("");
  const [addReference, setAddReference] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductImportSource | null>(null);

  const [reviewSource, setReviewSource] = useState<ProductImportSource | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<ExternalProductCandidate[] | null>(null);
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());
  const [committing, setCommitting] = useState(false);
  const [commitSummary, setCommitSummary] = useState<{ inserted: number; updated: number; skipped: number } | null>(
    null
  );

  async function handleAddSubmit(e: FormEvent) {
    e.preventDefault();
    setAddError(null);
    const formData = new FormData();
    formData.set("type", addType);
    formData.set("label", addLabel.trim());
    formData.set("reference", addReference.trim());

    setAdding(true);
    const result = await addImportSource(formData);
    setAdding(false);

    if (!result.ok) {
      setAddError(result.error);
      return;
    }
    showToast(`Sumber "${addLabel.trim()}" ditambahkan.`);
    setAddLabel("");
    setAddReference("");
  }

  async function confirmDeleteSource() {
    if (!deleteTarget) return;
    const result = await deleteImportSource(deleteTarget.id);
    if (!result.ok) {
      showToast(result.error, "error");
      setDeleteTarget(null);
      return;
    }
    showToast(`Sumber "${deleteTarget.label}" dihapus.`);
    setDeleteTarget(null);
  }

  async function startSync(source: ProductImportSource) {
    setReviewSource(source);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewWarnings([]);
    setCandidates(null);
    setCommitSummary(null);

    const result = await previewImportSource(source.id);
    setPreviewLoading(false);

    if (!result.ok) {
      setPreviewError(result.error);
      return;
    }
    setCandidates(result.candidates);
    setPreviewWarnings(result.warnings);
    // Default: semua kandidat tercentang — kebanyakan pemakaian memang
    // ingin ambil semua produk dari katalog/halaman itu, jadi lebih cepat
    // "uncheck yang tidak perlu" daripada "check satu-satu".
    setSelectedRefs(new Set(result.candidates.map((c) => c.externalRef)));
  }

  function closeReview() {
    setReviewSource(null);
    setCandidates(null);
    setPreviewError(null);
    setPreviewWarnings([]);
    setCommitSummary(null);
  }

  function toggleSelected(ref: string) {
    setSelectedRefs((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  }

  async function handleCommit() {
    if (!reviewSource || !candidates) return;
    setCommitting(true);
    const result = await commitImportCandidates(reviewSource.id, reviewSource.type, candidates, Array.from(selectedRefs));
    setCommitting(false);

    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setCommitSummary(result.summary);
    showToast(
      `Sinkron selesai: ${result.summary.inserted} produk baru, ${result.summary.updated} diperbarui${
        result.summary.skipped > 0 ? `, ${result.summary.skipped} dilewati` : ""
      }.`
    );
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Impor Otomatis</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Tarik data produk dari WhatsApp Business Catalog atau website Magna lainnya.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setManageOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
        >
          <Plus className="h-4 w-4" />
          Kelola Sumber
        </button>
      </div>

      {sources.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400 dark:text-zinc-500">
          Belum ada sumber impor — klik &quot;Kelola Sumber&quot; untuk menambahkan WhatsApp Catalog atau URL website.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {sources.map((source) => (
            <li
              key={source.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/5 bg-zinc-50 px-3.5 py-2.5 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {source.type === "whatsapp_catalog" ? (
                  <MessageCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-sky-500" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">{source.label}</p>
                  <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">
                    {TYPE_LABEL[source.type]} · {source.reference}
                    {source.lastSyncedAt && ` · Sinkron terakhir ${new Date(source.lastSyncedAt).toLocaleString("id-ID")}`}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => startSync(source)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100 dark:bg-teal-500/10 dark:text-teal-300"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Sinkron Sekarang
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(source)}
                  title="Hapus sumber"
                  aria-label="Hapus sumber"
                  className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal kelola sumber */}
      <Modal open={manageOpen} onClose={() => setManageOpen(false)} title="Kelola Sumber Impor">
        <form onSubmit={handleAddSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Jenis Sumber</label>
            <select
              value={addType}
              onChange={(e) => setAddType(e.target.value as ImportSourceType)}
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-teal-500/40 focus:ring-2 dark:border-white/10 dark:text-white dark:[&>option]:bg-zinc-900"
            >
              <option value="website">Website (URL halaman produk)</option>
              <option value="whatsapp_catalog">WhatsApp Business Catalog</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Nama (label)</label>
            <input
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              placeholder={addType === "website" ? "mis. Website Magnarent" : "mis. Katalog WA Magnarent"}
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-teal-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              {addType === "website" ? "URL Halaman Produk" : "Catalog ID (Meta Commerce Manager)"}
            </label>
            <input
              value={addReference}
              onChange={(e) => setAddReference(e.target.value)}
              placeholder={addType === "website" ? "https://situs-magna.com/produk/tenda-5x10" : "mis. 1234567890123456"}
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-teal-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
            {addType === "whatsapp_catalog" && (
              <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                Butuh environment variable <code>META_CATALOG_ACCESS_TOKEN</code> sudah diset di server — minta ke tim
                developer kalau belum.
              </p>
            )}
          </div>

          {addError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
              {addError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setManageOpen(false)}
              className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={adding || !addLabel.trim() || !addReference.trim()}
              className="inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Tambah Sumber
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal review hasil sinkron */}
      <Modal open={reviewSource !== null} onClose={closeReview} title={reviewSource ? `Sinkron: ${reviewSource.label}` : "Sinkron"}>
        <div className="space-y-3.5">
          {previewLoading && (
            <div className="flex items-center gap-2 py-6 text-sm text-zinc-500 dark:text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Mengambil data dari {reviewSource ? TYPE_LABEL[reviewSource.type] : "sumber"}…
            </div>
          )}

          {previewError && (
            <p className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {previewError}
            </p>
          )}

          {previewWarnings.length > 0 && (
            <div className="space-y-1 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              {previewWarnings.map((w, i) => (
                <p key={i} className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {w}
                </p>
              ))}
            </div>
          )}

          {commitSummary ? (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Selesai: {commitSummary.inserted} produk baru, {commitSummary.updated} diperbarui
                {commitSummary.skipped > 0 ? `, ${commitSummary.skipped} dilewati` : ""}.
              </p>
            </div>
          ) : (
            candidates &&
            candidates.length > 0 && (
              <>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Ditemukan {candidates.length} produk. Centang yang mau disimpan ke Katalog Produk — foto & harga akan
                  diperbarui otomatis untuk produk yang sudah pernah diimpor dari sumber ini.
                </p>
                <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
                  {candidates.map((c) => (
                    <label
                      key={c.externalRef}
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-black/5 bg-zinc-50 px-3 py-2 dark:border-white/10 dark:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRefs.has(c.externalRef)}
                        onChange={() => toggleSelected(c.externalRef)}
                        className="h-4 w-4 shrink-0 rounded border-black/20 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-white/10">
                        {c.photoUrls[0] && <Image src={c.photoUrls[0]} alt="" fill unoptimized className="object-cover" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{c.name}</span>
                        <span className="block text-xs text-zinc-400 dark:text-zinc-500">
                          {c.price ? formatRupiah(c.price) : "Harga belum diketahui"} · {c.photoUrls.length} foto
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )
          )}

          {!previewLoading && candidates && candidates.length === 0 && !previewError && (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">Tidak ada produk ditemukan.</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={closeReview}
              className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              {commitSummary ? "Tutup" : "Batal"}
            </button>
            {!commitSummary && candidates && candidates.length > 0 && (
              <button
                type="button"
                onClick={handleCommit}
                disabled={committing || selectedRefs.size === 0}
                className="inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              >
                {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {committing ? "Menyimpan…" : `Simpan ${selectedRefs.size} Produk`}
              </button>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteSource}
        title="Hapus Sumber Impor"
        description={
          deleteTarget && (
            <>
              Yakin hapus sumber <strong>{deleteTarget.label}</strong>? Produk yang sudah pernah diimpor dari sumber ini
              TIDAK ikut terhapus.
            </>
          )
        }
      />
    </div>
  );
}
