"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  Download,
  MessageCircle,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { formatRupiah } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";
import { createInvoice, deleteInvoice, markInvoiceStatus, sendInvoiceWhatsApp, updateInvoice } from "@/lib/invoices/actions";
import type { Invoice, InvoiceDivision, InvoiceSourceOption, InvoiceSourceType, InvoiceStatus } from "@/lib/invoices/types";
import { INVOICE_STATUS_STYLES as STATUS_BADGE } from "@/lib/status-styles";

const GRADIENT = "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)";

const DIVISION_LABEL: Record<InvoiceDivision, string> = {
  magnarent: "Magnarent",
  magnative: "Magnativ",
  production: "Production",
};

const DIVISION_BADGE: Record<InvoiceDivision, string> = {
  magnarent: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  magnative: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
  production: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
};

const ALL_DIVISIONS_FILTER = "Semua Divisi";
const ALL_STATUS_FILTER = "Semua Status";
const DIVISION_OPTIONS: InvoiceDivision[] = ["magnarent", "magnative", "production"];
const STATUS_OPTIONS: InvoiceStatus[] = ["Draft", "Terkirim", "Lunas"];

type ItemForm = { description: string; qty: string; unitPrice: string };

type FormState = {
  division: InvoiceDivision;
  sourceType?: InvoiceSourceType;
  sourceId?: string;
  clientName: string;
  clientPhone: string;
  items: ItemForm[];
  dueDate: string;
  catatan: string;
};

function emptyForm(): FormState {
  return {
    division: "magnarent",
    clientName: "",
    clientPhone: "",
    items: [{ description: "", qty: "1", unitPrice: "0" }],
    dueDate: "",
    catatan: "",
  };
}

function invoiceToForm(inv: Invoice): FormState {
  return {
    division: inv.division,
    sourceType: inv.sourceType,
    sourceId: inv.sourceId,
    clientName: inv.clientName,
    clientPhone: inv.clientPhone ?? "",
    items: inv.items.map((i) => ({ description: i.description, qty: String(i.qty), unitPrice: String(i.unitPrice) })),
    dueDate: inv.dueDate ?? "",
    catatan: inv.catatan ?? "",
  };
}

function computeTotal(items: ItemForm[]): number {
  return items.reduce((sum, it) => {
    const qty = Number(it.qty);
    const price = Number(it.unitPrice);
    if (!Number.isFinite(qty) || !Number.isFinite(price)) return sum;
    return sum + qty * price;
  }, 0);
}

function formatTanggal(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Anotasi urgensi jatuh tempo di tabel — pelengkap visual untuk pengingat
 * push otomatis (lihat src/app/api/cron/invoice-reminders/route.ts), supaya
 * staf yang sedang buka halaman ini pun langsung lihat mana yang mendesak
 * tanpa harus menunggu notifikasi push. Invoice yang sudah "Lunas" atau
 * belum diisi jatuh temponya tidak dapat anotasi sama sekali.
 */
function dueUrgency(inv: Invoice): { label: string; className: string } | null {
  if (inv.status === "Lunas" || !inv.dueDate) return null;
  const due = new Date(`${inv.dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `Terlambat ${Math.abs(diffDays)} hari`, className: "text-rose-600 dark:text-rose-400" };
  }
  if (diffDays === 0) {
    return { label: "Jatuh tempo hari ini", className: "text-amber-600 dark:text-amber-400" };
  }
  if (diffDays <= 3) {
    return { label: `${diffDays} hari lagi`, className: "text-amber-600 dark:text-amber-400" };
  }
  return null;
}

/**
 * Halaman Faktur — buat invoice dari booking/proyek yang sudah ada (picker
 * `sourceOptions`, dikirim dari page.tsx) atau manual, download PDF-nya
 * (di-generate on-demand lewat src/app/api/invoices/[id]/pdf/route.ts), dan
 * kirim ke WhatsApp klien lewat webhook n8n yang sudah dipakai bot WhatsApp
 * Magnarent (lihat src/lib/invoices/whatsapp.ts + actions.ts).
 *
 * Subtotal/total item DIHITUNG ULANG DI SERVER saat disimpan (lihat
 * `createInvoice`/`updateInvoice`) — angka yang tampil di sini cuma pratinjau
 * di browser, bukan yang benar-benar dipercaya untuk disimpan.
 */
export function InvoiceManager({
  invoices,
  sourceOptions,
}: {
  invoices: Invoice[];
  sourceOptions: InvoiceSourceOption[];
}) {
  const { showToast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const [sourceSearch, setSourceSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [divisionFilter, setDivisionFilter] = useState<string>(ALL_DIVISIONS_FILTER);
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUS_FILTER);

  const filteredInvoices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return invoices.filter((inv) => {
      const matchesSearch =
        !term || inv.invoiceNumber.toLowerCase().includes(term) || inv.clientName.toLowerCase().includes(term);
      const matchesDivision = divisionFilter === ALL_DIVISIONS_FILTER || inv.division === divisionFilter;
      const matchesStatus = statusFilter === ALL_STATUS_FILTER || inv.status === statusFilter;
      return matchesSearch && matchesDivision && matchesStatus;
    });
  }, [invoices, searchTerm, divisionFilter, statusFilter]);

  const filteredSourceOptions = useMemo(() => {
    const term = sourceSearch.trim().toLowerCase();
    if (!term) return sourceOptions.slice(0, 20);
    return sourceOptions
      .filter((o) => o.label.toLowerCase().includes(term) || o.clientName.toLowerCase().includes(term))
      .slice(0, 20);
  }, [sourceOptions, sourceSearch]);

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm());
    setSourceSearch("");
    setError(null);
    setFormOpen(true);
  }

  function openEditModal(inv: Invoice) {
    setEditingId(inv.id);
    setForm(invoiceToForm(inv));
    setError(null);
    setFormOpen(true);
  }

  function closeFormModal() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
  }

  function pickSource(opt: InvoiceSourceOption) {
    setForm((f) => ({
      ...f,
      division: opt.division,
      sourceType: opt.sourceType,
      sourceId: opt.sourceId,
      clientName: opt.clientName,
      clientPhone: opt.clientPhone ?? f.clientPhone,
      items: [{ description: opt.label, qty: "1", unitPrice: String(opt.amount) }],
    }));
  }

  function clearSource() {
    setForm((f) => ({ ...f, sourceType: undefined, sourceId: undefined }));
  }

  function addItemRow() {
    setForm((f) => ({ ...f, items: [...f.items, { description: "", qty: "1", unitPrice: "0" }] }));
  }

  function removeItemRow(index: number) {
    setForm((f) => ({ ...f, items: f.items.length > 1 ? f.items.filter((_, i) => i !== index) : f.items }));
  }

  function updateItemRow(index: number, field: keyof ItemForm, value: string) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === index ? { ...it, [field]: value } : it)),
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!form.clientName.trim()) {
      setError("Nama klien wajib diisi.");
      return;
    }

    const payload = {
      division: form.division,
      sourceType: form.sourceType,
      sourceId: form.sourceId,
      clientName: form.clientName.trim(),
      clientPhone: form.clientPhone.trim() || undefined,
      items: form.items.map((it) => ({
        description: it.description.trim(),
        qty: Number(it.qty),
        unitPrice: Number(it.unitPrice),
      })),
      dueDate: form.dueDate || undefined,
      catatan: form.catatan.trim() || undefined,
    };

    setSubmitting(true);
    const result = editingId ? await updateInvoice(editingId, payload) : await createInvoice(payload);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    showToast(editingId ? "Invoice berhasil diperbarui." : "Invoice berhasil dibuat.");
    closeFormModal();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const result = await deleteInvoice(deleteTarget.id);
    if (!result.ok) {
      showToast(result.error, "error");
      setDeleteTarget(null);
      return;
    }
    showToast(`Invoice ${deleteTarget.invoiceNumber} berhasil dihapus.`);
    setDeleteTarget(null);
  }

  async function handleSendWhatsApp(inv: Invoice) {
    if (!inv.clientPhone) {
      showToast("Nomor WhatsApp klien belum diisi — edit invoice ini dulu.", "error");
      return;
    }
    setSendingId(inv.id);
    const result = await sendInvoiceWhatsApp(inv.id);
    setSendingId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast(`Invoice ${inv.invoiceNumber} berhasil dikirim ke WhatsApp ${inv.clientPhone}.`);
  }

  async function handleStatusChange(inv: Invoice, status: InvoiceStatus) {
    setStatusUpdatingId(inv.id);
    const result = await markInvoiceStatus(inv.id, status);
    setStatusUpdatingId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast(`Status invoice ${inv.invoiceNumber} diubah jadi "${status}".`);
  }

  const formTotal = computeTotal(form.items);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Daftar Invoice</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {filteredInvoices.length} dari {invoices.length} invoice ditampilkan
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: GRADIENT }}
        >
          <Plus className="h-4 w-4" />
          Buat Invoice
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nomor invoice atau nama klien…"
            className="w-full rounded-full border border-black/10 bg-white py-2 pl-9 pr-3.5 text-sm text-zinc-900 outline-none ring-indigo-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
          />
        </div>
        <select
          value={divisionFilter}
          onChange={(e) => setDivisionFilter(e.target.value)}
          className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-sm text-zinc-700 outline-none ring-indigo-500/40 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
        >
          <option>{ALL_DIVISIONS_FILTER}</option>
          {DIVISION_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {DIVISION_LABEL[d]}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-sm text-zinc-700 outline-none ring-indigo-500/40 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
        >
          <option>{ALL_STATUS_FILTER}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <th className="px-5 py-3">Nomor</th>
                <th className="px-5 py-3">Klien</th>
                <th className="px-5 py-3">Divisi</th>
                <th className="px-5 py-3">Diterbitkan</th>
                <th className="px-5 py-3">Jatuh Tempo</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={Receipt}
                      title={invoices.length === 0 ? "Belum ada invoice" : "Tidak ada hasil"}
                      description={
                        invoices.length === 0
                          ? 'Klik "Buat Invoice" untuk membuat invoice pertama, dari booking/proyek yang sudah ada atau manual.'
                          : "Coba ubah kata kunci pencarian atau filter."
                      }
                    />
                  </td>
                </tr>
              )}
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{inv.invoiceNumber}</td>
                  <td className="px-5 py-3">
                    <div className="text-zinc-700 dark:text-zinc-200">{inv.clientName}</div>
                    {inv.clientPhone && (
                      <div className="text-xs text-zinc-400 dark:text-zinc-500">{inv.clientPhone}</div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", DIVISION_BADGE[inv.division])}>
                      {DIVISION_LABEL[inv.division]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{formatTanggal(inv.issuedDate)}</td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">
                    {inv.dueDate ? formatTanggal(inv.dueDate) : "—"}
                    {(() => {
                      const urgency = dueUrgency(inv);
                      return urgency ? (
                        <p className={cn("mt-0.5 text-[11px] font-semibold", urgency.className)}>{urgency.label}</p>
                      ) : null;
                    })()}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {formatRupiah(inv.total)}
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={inv.status}
                      disabled={statusUpdatingId === inv.id}
                      onChange={(e) => handleStatusChange(inv, e.target.value as InvoiceStatus)}
                      className={cn(
                        "rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ring-indigo-500/40 focus:ring-2 disabled:opacity-60",
                        STATUS_BADGE[inv.status]
                      )}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <a
                        href={`/api/invoices/${inv.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Download PDF"
                        className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(inv)}
                        disabled={sendingId === inv.id}
                        title={inv.clientPhone ? "Kirim ke WhatsApp" : "Nomor WhatsApp klien belum diisi"}
                        aria-label={inv.clientPhone ? "Kirim ke WhatsApp" : "Nomor WhatsApp klien belum diisi"}
                        className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-60 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                      >
                        <MessageCircle className={cn("h-4 w-4", sendingId === inv.id && "animate-pulse")} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(inv)}
                        title="Edit invoice"
                        aria-label="Edit invoice"
                        className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(inv)}
                        title="Hapus invoice"
                        aria-label="Hapus invoice"
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

      {/* Modal tambah/edit invoice */}
      <Modal open={formOpen} onClose={closeFormModal} title={editingId ? "Edit Invoice" : "Buat Invoice Baru"} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {!editingId && (
            <div>
              <label htmlFor="invoice-source-search" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Pilih dari booking/proyek yang sudah ada (opsional)
              </label>
              {form.sourceType ? (
                <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-sm text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                  <span>Terhubung ke {form.items[0]?.description || "sumber terpilih"}</span>
                  <button type="button" onClick={clearSource} className="font-semibold underline">
                    Lepas tautan
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      id="invoice-source-search"
                      value={sourceSearch}
                      onChange={(e) => setSourceSearch(e.target.value)}
                      placeholder="Cari booking/proyek atau nama klien…"
                      className="w-full rounded-xl border border-black/10 bg-transparent py-2.5 pl-9 pr-3.5 text-sm text-zinc-900 outline-none ring-indigo-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
                    />
                  </div>
                  {filteredSourceOptions.length > 0 && (
                    <div className="mt-1.5 max-h-40 overflow-y-auto rounded-xl border border-black/10 dark:border-white/10">
                      {filteredSourceOptions.map((opt) => (
                        <button
                          key={`${opt.sourceType}-${opt.sourceId}`}
                          type="button"
                          onClick={() => pickSource(opt)}
                          className="flex w-full items-center justify-between gap-2 border-b border-black/5 px-3.5 py-2 text-left text-sm last:border-0 hover:bg-zinc-50 dark:border-white/5 dark:hover:bg-white/5"
                        >
                          <span>
                            <span className="block font-medium text-zinc-800 dark:text-zinc-100">{opt.label}</span>
                            <span className="block text-xs text-zinc-400">
                              {opt.clientName} · {DIVISION_LABEL[opt.division]}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                            {formatRupiah(opt.amount)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                    Atau langsung isi form manual di bawah tanpa memilih apa pun.
                  </p>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="invoice-division" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Divisi</label>
              <select
                id="invoice-division"
                value={form.division}
                onChange={(e) => setForm((f) => ({ ...f, division: e.target.value as InvoiceDivision }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-indigo-500/40 focus:ring-2 dark:border-white/10 dark:text-white dark:[&>option]:bg-zinc-900"
              >
                {DIVISION_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {DIVISION_LABEL[d]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="invoice-due-date" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Jatuh Tempo (opsional)</label>
              <input
                id="invoice-due-date"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-indigo-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="invoice-client-name" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Nama Klien</label>
              <input
                id="invoice-client-name"
                value={form.clientName}
                onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                placeholder="mis. PT Sejahtera Abadi"
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-indigo-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="invoice-client-phone" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">No. WhatsApp</label>
              <input
                id="invoice-client-phone"
                value={form.clientPhone}
                onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))}
                placeholder="mis. 081234567890"
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-indigo-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Item</label>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah baris
              </button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={item.description}
                    onChange={(e) => updateItemRow(i, "description", e.target.value)}
                    placeholder="Deskripsi"
                    className="flex-1 rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none ring-indigo-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
                  />
                  <input
                    type="number"
                    min={0}
                    value={item.qty}
                    onChange={(e) => updateItemRow(i, "qty", e.target.value)}
                    placeholder="Qty"
                    className="w-16 rounded-xl border border-black/10 bg-transparent px-2.5 py-2 text-sm text-zinc-900 outline-none ring-indigo-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
                  />
                  <input
                    type="number"
                    min={0}
                    value={item.unitPrice}
                    onChange={(e) => updateItemRow(i, "unitPrice", e.target.value)}
                    placeholder="Harga satuan"
                    className="w-32 rounded-xl border border-black/10 bg-transparent px-2.5 py-2 text-sm text-zinc-900 outline-none ring-indigo-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => removeItemRow(i)}
                    disabled={form.items.length <= 1}
                    className="shrink-0 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-right text-sm font-bold text-zinc-900 dark:text-white">
              Total: {formatRupiah(formTotal)}
            </p>
          </div>

          <div>
            <label htmlFor="invoice-catatan" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Catatan (opsional)</label>
            <textarea
              id="invoice-catatan"
              value={form.catatan}
              onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-indigo-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
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
              className="rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
              style={{ background: GRADIENT }}
            >
              {submitting ? "Menyimpan…" : editingId ? "Simpan Perubahan" : "Buat Invoice"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Hapus Invoice?"
        description={
          deleteTarget && (
            <>
              Invoice <strong>{deleteTarget.invoiceNumber}</strong> untuk <strong>{deleteTarget.clientName}</strong>{" "}
              akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </>
          )
        }
      />
    </div>
  );
}
