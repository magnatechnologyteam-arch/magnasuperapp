"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import {
  Boxes,
  Download,
  FileSpreadsheet,
  ImageIcon,
  Pencil,
  Plus,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { formatRupiah } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";
import { addProduct, bulkImportProducts, deleteProduct, updateProduct } from "@/lib/products/actions";
import type { ImportSummary, Product, ProductDivision, ProductImportRow } from "@/lib/products/types";

const GRADIENT = "linear-gradient(135deg, #14B8A6 0%, #22D3EE 100%)";

const DIVISION_LABEL: Record<ProductDivision, string> = {
  magnarent: "Magnarent",
  magnativ: "Magnativ",
  production: "Production",
  umum: "Umum",
};

const DIVISION_BADGE: Record<ProductDivision, string> = {
  magnarent: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  magnativ: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
  production: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
  umum: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
};

const ALL_DIVISIONS_FILTER = "Semua Divisi";
const DIVISION_OPTIONS: ProductDivision[] = ["umum", "magnarent", "magnativ", "production"];

const TEMPLATE_HEADERS = ["Nama", "Divisi", "Kategori", "SKU", "Harga", "Satuan", "Stok", "Supplier", "Catatan"];
const TEMPLATE_EXAMPLE = [
  "Tenda Roder 5x10m",
  "magnarent",
  "Tenda & Struktur",
  "TR-5X10",
  "850000",
  "unit",
  "8",
  "CV Mitra Tenda",
  "Contoh baris — boleh dihapus",
];

function emptyForm() {
  return {
    name: "",
    division: "umum" as ProductDivision,
    category: "",
    sku: "",
    price: "0",
    unit: "unit",
    stock: "0",
    supplier: "",
    catatan: "",
  };
}

function productToForm(p: Product) {
  return {
    name: p.name,
    division: p.division,
    category: p.category,
    sku: p.sku ?? "",
    price: String(p.price),
    unit: p.unit,
    stock: String(p.stock),
    supplier: p.supplier ?? "",
    catatan: p.catatan ?? "",
  };
}

/** Header di file sumber dicocokkan longgar (huruf kecil, tanpa spasi/simbol) — supaya "Nama Produk", "nama_produk", "NAMA" semua kebaca sebagai "name". */
function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

const HEADER_MAP: Record<string, keyof ProductImportRow> = {
  nama: "name",
  namaproduk: "name",
  produk: "name",
  divisi: "division",
  division: "division",
  kategori: "category",
  category: "category",
  sku: "sku",
  kode: "sku",
  kodeproduk: "sku",
  harga: "price",
  price: "price",
  satuan: "unit",
  unit: "unit",
  stok: "stock",
  stock: "stock",
  supplier: "supplier",
  pemasok: "supplier",
  catatan: "catatan",
  keterangan: "catatan",
};

function rowsFromParsedSheet(json: Record<string, unknown>[]): ProductImportRow[] {
  return json.map((raw) => {
    // Ditulis ke objek longgar (`Record<string, unknown>`) lalu di-cast di
    // akhir — bukan langsung ke `ProductImportRow` — karena TypeScript
    // tidak bisa menyimpulkan tipe nilai yang benar dari `mapped` (tipe
    // `keyof ProductImportRow`) di properti bertipe campuran begini;
    // bentuknya tetap dijamin sesuai lewat cara nilainya diisi di bawah.
    const row: Record<string, unknown> = { name: "" };
    for (const [key, value] of Object.entries(raw)) {
      const mapped = HEADER_MAP[normalizeHeader(key)];
      if (!mapped || value === undefined || value === null || value === "") continue;

      if (mapped === "price" || mapped === "stock") {
        const num = Number(value);
        if (Number.isFinite(num)) row[mapped] = num;
      } else if (mapped === "division") {
        const v = String(value).trim().toLowerCase();
        row.division = ["magnarent", "magnativ", "production", "umum"].includes(v) ? v : "umum";
      } else {
        row[mapped] = String(value).trim();
      }
    }
    return row as ProductImportRow;
  });
}

function downloadTemplate() {
  const csv = [TEMPLATE_HEADERS.join(","), TEMPLATE_EXAMPLE.join(",")].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "template-produk.csv";
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Katalog Produk terpusat — CRUD manual (pola sama seperti InventoryManager/
 * ProjectManager) DITAMBAH import massal dari Excel/CSV. File di-parse di
 * browser dengan library `xlsx` (dynamic import supaya tidak membengkakkan
 * bundle awal untuk halaman yang tidak memakainya) lalu baris hasil parse
 * dikirim ke Server Action `bulkImportProducts` sebagai data biasa.
 *
 * Untuk automation eksternal (n8n dsb.), ada jalur terpisah lewat
 * `src/app/api/products/route.ts` (API key) — tidak melalui komponen ini
 * sama sekali, cuma disebutkan di catatan bawah tabel supaya Owner tahu
 * jalur itu ada.
 */
export function ProductManager({ products }: { products: Product[] }) {
  const { showToast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [divisionFilter, setDivisionFilter] = useState<string>(ALL_DIVISIONS_FILTER);

  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ProductImportRow[] | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importParsing, setImportParsing] = useState(false);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        (p.sku ?? "").toLowerCase().includes(term);
      const matchesDivision = divisionFilter === ALL_DIVISIONS_FILTER || p.division === divisionFilter;
      return matchesSearch && matchesDivision;
    });
  }, [products, searchTerm, divisionFilter]);

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm());
    setPhotoPreview(null);
    setError(null);
    setFormOpen(true);
  }

  function openEditModal(p: Product) {
    setEditingId(p.id);
    setForm(productToForm(p));
    setPhotoPreview(p.photoUrl ?? null);
    setError(null);
    setFormOpen(true);
  }

  function closeFormModal() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setPhotoPreview(null);
    setError(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function handlePhotoChange() {
    const file = photoInputRef.current?.files?.[0];
    setPhotoPreview(file ? URL.createObjectURL(file) : editingId ? photoPreview : null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Nama produk wajib diisi.");
      return;
    }

    const formData = new FormData();
    formData.set("name", form.name.trim());
    formData.set("division", form.division);
    formData.set("category", form.category.trim());
    formData.set("sku", form.sku.trim());
    formData.set("price", form.price);
    formData.set("unit", form.unit.trim() || "unit");
    formData.set("stock", form.stock);
    formData.set("supplier", form.supplier.trim());
    formData.set("catatan", form.catatan.trim());
    const file = photoInputRef.current?.files?.[0];
    if (file) formData.set("photo", file);

    setSubmitting(true);
    const result = editingId ? await updateProduct(editingId, formData) : await addProduct(formData);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    showToast(editingId ? `"${form.name.trim()}" berhasil diperbarui.` : `"${form.name.trim()}" berhasil ditambahkan.`);
    closeFormModal();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const result = await deleteProduct(deleteTarget.id);
    if (!result.ok) {
      showToast(result.error, "error");
      setDeleteTarget(null);
      return;
    }
    showToast(`"${deleteTarget.name}" berhasil dihapus.`);
    setDeleteTarget(null);
  }

  function closeImportModal() {
    setImportOpen(false);
    setImportRows(null);
    setImportFileName(null);
    setImportSummary(null);
    setImportError(null);
    if (importInputRef.current) importInputRef.current.value = "";
  }

  async function handleImportFileChange() {
    const file = importInputRef.current?.files?.[0];
    setImportSummary(null);
    setImportError(null);
    if (!file) {
      setImportRows(null);
      setImportFileName(null);
      return;
    }

    setImportParsing(true);
    setImportFileName(file.name);
    try {
      // Import dinamis supaya "xlsx" tidak ikut ke bundle awal halaman ini
      // (cuma dipakai saat user benar-benar buka modal import). Di-typing
      // `any` dengan sengaja: "xlsx" paket CommonJS, dan versi TypeScript
      // yang dipakai Vercel (build kemarin sempat gagal type-check karena
      // ini) tidak konsisten soal bentuk `default` di hasil dynamic import
      // CJS — `.default` di-fallback ke modul itu sendiri di RUNTIME, dan
      // `any` di sini menghindari TypeScript memvonis salah satu bentuk
      // sebagai satu-satunya yang benar.
      const xlsxModule: any = await import("xlsx");
      const XLSX = xlsxModule.default ?? xlsxModule;
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const rows = rowsFromParsedSheet(json).filter((r) => r.name);

      if (rows.length === 0) {
        setImportError("Tidak ada baris dengan kolom \"Nama\" terisi di file ini.");
        setImportRows(null);
        return;
      }
      setImportRows(rows);
    } catch (err) {
      console.error("[products] Gagal membaca file:", err);
      setImportError("Gagal membaca file — pastikan formatnya .xlsx, .xls, atau .csv.");
      setImportRows(null);
    } finally {
      setImportParsing(false);
    }
  }

  async function handleImportConfirm() {
    if (!importRows || importRows.length === 0) return;
    setImportSubmitting(true);
    setImportError(null);
    const result = await bulkImportProducts(importRows);
    setImportSubmitting(false);

    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    setImportSummary(result.summary);
    setImportRows(null);
    showToast(
      `Import selesai: ${result.summary.inserted} baru, ${result.summary.updated} diperbarui${
        result.summary.skipped > 0 ? `, ${result.summary.skipped} dilewati` : ""
      }.`
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Daftar Produk</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {filteredProducts.length} dari {products.length} produk ditampilkan
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Import Excel/CSV
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: GRADIENT }}
          >
            <Plus className="h-4 w-4" />
            Tambah Produk
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama, kategori, atau SKU…"
            className="w-full rounded-full border border-black/10 bg-white py-2 pl-9 pr-3.5 text-sm text-zinc-900 outline-none ring-teal-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
          />
        </div>
        <select
          value={divisionFilter}
          onChange={(e) => setDivisionFilter(e.target.value)}
          className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-sm text-zinc-700 outline-none ring-teal-500/40 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
        >
          <option>{ALL_DIVISIONS_FILTER}</option>
          {DIVISION_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {DIVISION_LABEL[d]}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <th className="px-5 py-3">Produk</th>
                <th className="px-5 py-3">Divisi</th>
                <th className="px-5 py-3">Kategori</th>
                <th className="px-5 py-3">SKU</th>
                <th className="px-5 py-3 text-right">Harga</th>
                <th className="px-5 py-3 text-right">Stok</th>
                <th className="px-5 py-3">Supplier</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={Boxes}
                      title={products.length === 0 ? "Belum ada produk" : "Tidak ada hasil"}
                      description={
                        products.length === 0
                          ? 'Klik "Tambah Produk" atau "Import Excel/CSV" untuk mulai mengisi katalog.'
                          : "Coba ubah kata kunci pencarian atau filter divisi."
                      }
                    />
                  </td>
                </tr>
              )}
              {filteredProducts.map((p) => (
                <tr key={p.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">
                    <span className="inline-flex items-center gap-2.5">
                      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-white/5">
                        {p.photoUrl ? (
                          <Image src={p.photoUrl} alt={p.name} fill className="object-cover" />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-zinc-300 dark:text-zinc-600">
                            <ImageIcon className="h-4 w-4" />
                          </span>
                        )}
                      </span>
                      {p.name}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", DIVISION_BADGE[p.division])}>
                      {DIVISION_LABEL[p.division]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{p.category || "—"}</td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{p.sku || "—"}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {formatRupiah(p.price)}
                    <span className="ml-1 text-xs text-zinc-400 dark:text-zinc-500">/{p.unit}</span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">{p.stock}</td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{p.supplier || "—"}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        title="Edit produk"
                        className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-500/10 dark:hover:text-teal-300"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                        title="Hapus produk"
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

      <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
        Butuh isi data otomatis dari tools luar (mis. n8n)? Ada API terpisah dengan API key — minta ke tim developer
        untuk detail koneksinya.
      </p>

      {/* Modal tambah/edit produk */}
      <Modal open={formOpen} onClose={closeFormModal} title={editingId ? "Edit Produk" : "Tambah Produk Baru"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Foto (opsional)</label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-teal-500/40 file:mr-3 file:rounded-full file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-teal-700 focus:ring-2 dark:border-white/10 dark:text-white dark:file:bg-teal-500/10 dark:file:text-teal-300"
            />
            {photoPreview && (
              <div className="relative mt-2.5 aspect-video w-full overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal dari blob: URL / foto lama, next/image tidak perlu untuk ini */}
                <img src={photoPreview} alt="Pratinjau foto produk" className="h-full w-full object-cover" />
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Nama Produk</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="mis. Tenda Roder 5x10m"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-teal-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Divisi</label>
              <select
                value={form.division}
                onChange={(e) => setForm((f) => ({ ...f, division: e.target.value as ProductDivision }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-teal-500/40 focus:ring-2 dark:border-white/10 dark:text-white dark:[&>option]:bg-zinc-900"
              >
                {DIVISION_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {DIVISION_LABEL[d]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Kategori</label>
              <input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="mis. Tenda & Struktur"
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-teal-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                SKU/Kode (opsional)
              </label>
              <input
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                placeholder="mis. TR-5X10"
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-teal-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Satuan</label>
              <input
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                placeholder="mis. unit, pcs, paket"
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-teal-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Harga (Rp)</label>
              <input
                type="number"
                min={0}
                step={1000}
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-teal-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Stok</label>
              <input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-teal-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Supplier (opsional)
            </label>
            <input
              value={form.supplier}
              onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
              placeholder="mis. CV Mitra Tenda"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-teal-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Catatan (opsional)
            </label>
            <input
              value={form.catatan}
              onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-teal-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
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
              {submitting ? "Menyimpan…" : editingId ? "Simpan Perubahan" : "Simpan Produk"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal import Excel/CSV */}
      <Modal open={importOpen} onClose={closeImportModal} title="Import Produk dari Excel/CSV">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-teal-50 px-3.5 py-2.5 text-xs text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
            <span>Belum punya format file? Unduh template contohnya dulu.</span>
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 font-semibold text-teal-700 shadow-sm dark:bg-zinc-900 dark:text-teal-300"
            >
              <Download className="h-3.5 w-3.5" />
              Template
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Pilih file (.xlsx, .xls, atau .csv)
            </label>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportFileChange}
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-teal-500/40 file:mr-3 file:rounded-full file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-teal-700 focus:ring-2 dark:border-white/10 dark:text-white dark:file:bg-teal-500/10 dark:file:text-teal-300"
            />
            <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
              Kolom yang dikenali: Nama, Divisi, Kategori, SKU, Harga, Satuan, Stok, Supplier, Catatan (urutan bebas,
              tidak semua wajib diisi — cuma "Nama" yang wajib).
            </p>
          </div>

          {importParsing && <p className="text-sm text-zinc-500 dark:text-zinc-400">Membaca file…</p>}

          {importError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
              {importError}
            </p>
          )}

          {importRows && !importSummary && (
            <div className="rounded-xl border border-black/10 bg-zinc-50 px-3.5 py-3 text-sm dark:border-white/10 dark:bg-white/5">
              <p className="font-semibold text-zinc-700 dark:text-zinc-200">
                Ditemukan {importRows.length} baris produk di &quot;{importFileName}&quot;.
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Produk dengan SKU yang sudah ada akan diperbarui; sisanya jadi produk baru. Klik &quot;Proses
                Import&quot; untuk melanjutkan.
              </p>
            </div>
          )}

          {importSummary && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
              <p className="font-semibold">
                Selesai: {importSummary.inserted} produk baru, {importSummary.updated} diperbarui
                {importSummary.skipped > 0 ? `, ${importSummary.skipped} dilewati` : ""}.
              </p>
              {importSummary.errors.length > 0 && (
                <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-emerald-700 dark:text-emerald-300">
                  {importSummary.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {importSummary.errors.length > 10 && <li>…dan {importSummary.errors.length - 10} lainnya.</li>}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeImportModal}
              className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              {importSummary ? "Tutup" : "Batal"}
            </button>
            {!importSummary && (
              <button
                type="button"
                onClick={handleImportConfirm}
                disabled={!importRows || importSubmitting}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                style={{ background: GRADIENT }}
              >
                <UploadCloud className="h-4 w-4" />
                {importSubmitting ? "Memproses…" : "Proses Import"}
              </button>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Hapus Produk"
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
