"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Plus, Receipt, Upload, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { todayISO } from "@/lib/shared/utils";
import { addEventExpense, addExpenseProof } from "@/lib/event-expenses/actions";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_DIVISION_LABELS,
  PAYMENT_METHOD_SUGGESTIONS,
  REIMBURSEMENT_STATUSES,
  type EventExpense,
  type ExpenseSourceOption,
} from "@/lib/event-expenses/types";

const GRADIENT = "linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)";

function sourceKeyOf(opt: ExpenseSourceOption) {
  return `${opt.sourceType}::${opt.sourceId ?? "umum"}`;
}

function emptyForm() {
  return {
    expenseDate: todayISO(),
    sourceKey: "",
    category: EXPENSE_CATEGORIES[0],
    amount: "0",
    picName: "",
    paymentMethod: "",
    reimbursementStatus: REIMBURSEMENT_STATUSES[0],
    notes: "",
  };
}

/**
 * Form "Catat Pengeluaran" untuk modul Realisasi Event (Tahap B). Alur
 * submit dua langkah: (1) simpan baris pengeluaran lewat `addEventExpense`
 * untuk dapat `id`-nya, (2) BARU upload tiap file bukti satu-satu lewat
 * `addExpenseProof` — file butuh `id` pengeluaran yang sudah tersimpan
 * (lihat komentar di action-nya kenapa dilakukan berurutan, bukan sekaligus
 * dalam satu FormData).
 *
 * Kalau langkah (2) sebagian gagal, pengeluarannya SENGAJA tetap tersimpan
 * (bukan di-rollback) — datanya sudah benar, tinggal user unggah ulang
 * bukti yang gagal lewat halaman detail nanti. Lebih aman daripada
 * kehilangan pencatatan pengeluaran cuma karena satu file gagal ter-upload.
 */
export function EventExpenseFormModal({
  open,
  onClose,
  sourceOptions,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  sourceOptions: ExpenseSourceOption[];
  onCreated: (expense: EventExpense) => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);

  const sourceByKey = useMemo(() => {
    const map = new Map<string, ExpenseSourceOption>();
    for (const opt of sourceOptions) map.set(sourceKeyOf(opt), opt);
    return map;
  }, [sourceOptions]);

  const grouped = useMemo(() => {
    const byDivision = new Map<string, ExpenseSourceOption[]>();
    for (const opt of sourceOptions) {
      if (opt.sourceType === "umum") continue;
      const list = byDivision.get(opt.division) ?? [];
      list.push(opt);
      byDivision.set(opt.division, list);
    }
    return byDivision;
  }, [sourceOptions]);

  const umumOption = sourceOptions.find((o) => o.sourceType === "umum");

  function handleClose() {
    setForm(emptyForm());
    setFiles([]);
    setError(null);
    setUploadWarning(null);
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setUploadWarning(null);

    const amount = Number(form.amount);
    const selected = sourceByKey.get(form.sourceKey);

    if (!selected) {
      setError('Pilih event/proyek terkait, atau "Finance/Umum" kalau tidak terikat event.');
      return;
    }
    if (!form.picName.trim()) {
      setError("PIC yang mengeluarkan dana wajib diisi.");
      return;
    }
    if (!form.paymentMethod.trim()) {
      setError("Metode pembayaran wajib diisi.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Nominal harus lebih dari 0.");
      return;
    }

    setSubmitting(true);
    const result = await addEventExpense({
      expenseDate: form.expenseDate,
      division: selected.division,
      sourceType: selected.sourceType,
      sourceId: selected.sourceId,
      category: form.category,
      amount,
      picName: form.picName,
      paymentMethod: form.paymentMethod,
      reimbursementStatus: form.reimbursementStatus,
      notes: form.notes,
    });

    if (!result.ok) {
      setSubmitting(false);
      setError(result.error);
      return;
    }

    const expense = result.expense;
    const failedFiles: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const fd = new FormData();
      fd.set("expenseId", expense.id);
      fd.set("picName", form.picName);
      fd.set("expenseDate", form.expenseDate);
      fd.set("amount", String(amount));
      fd.set("note", form.notes || form.category);
      fd.set("index", String(i + 1));
      fd.set("file", files[i]);

      const proofResult = await addExpenseProof(fd);
      if (proofResult.ok) {
        expense.proofs.push(proofResult.proof);
      } else {
        failedFiles.push(files[i].name);
      }
    }

    setSubmitting(false);
    if (failedFiles.length > 0) {
      setUploadWarning(
        `Pengeluaran tersimpan, tapi ${failedFiles.length} bukti gagal diunggah: ${failedFiles.join(", ")}. Coba unggah ulang dari daftar.`
      );
    }
    onCreated(expense);
    if (failedFiles.length === 0) {
      handleClose();
    } else {
      setForm(emptyForm());
      setFiles([]);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Catat Pengeluaran" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="ee-source" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Event / Proyek Terkait
          </label>
          <select
            id="ee-source"
            required
            value={form.sourceKey}
            onChange={(e) => setForm((f) => ({ ...f, sourceKey: e.target.value }))}
            className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-violet-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
          >
            <option value="" disabled>
              Pilih event/proyek…
            </option>
            {umumOption && <option value={sourceKeyOf(umumOption)}>{umumOption.label}</option>}
            {Array.from(grouped.entries()).map(([division, opts]) => (
              <optgroup key={division} label={EXPENSE_DIVISION_LABELS[division as keyof typeof EXPENSE_DIVISION_LABELS]}>
                {opts.map((opt) => (
                  <option key={sourceKeyOf(opt)} value={sourceKeyOf(opt)}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ee-date" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Tanggal Pengeluaran
            </label>
            <input
              id="ee-date"
              type="date"
              required
              value={form.expenseDate}
              onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-violet-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="ee-category" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Kategori
            </label>
            <select
              id="ee-category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as typeof f.category }))}
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-violet-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ee-amount" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Nominal (Rp)
            </label>
            <input
              id="ee-amount"
              type="number"
              min={0}
              required
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-violet-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="ee-pic" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              PIC Pengeluaran
            </label>
            <input
              id="ee-pic"
              required
              value={form.picName}
              onChange={(e) => setForm((f) => ({ ...f, picName: e.target.value }))}
              placeholder="Nama yang mengeluarkan dana"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-violet-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ee-method" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Metode Pembayaran
            </label>
            <input
              id="ee-method"
              list="ee-method-suggestions"
              required
              value={form.paymentMethod}
              onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
              placeholder="mis. Transfer BCA"
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-violet-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
            />
            <datalist id="ee-method-suggestions">
              {PAYMENT_METHOD_SUGGESTIONS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="ee-reimburse" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Status Penggantian Dana
            </label>
            <select
              id="ee-reimburse"
              value={form.reimbursementStatus}
              onChange={(e) => setForm((f) => ({ ...f, reimbursementStatus: e.target.value as typeof f.reimbursementStatus }))}
              className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-violet-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
            >
              {REIMBURSEMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="ee-notes" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Keterangan (opsional)
          </label>
          <textarea
            id="ee-notes"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="mis. Sewa venue hari-H"
            className="w-full resize-none rounded-xl border border-black/10 bg-transparent px-3.5 py-2.5 text-sm text-zinc-900 outline-none ring-violet-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Bukti Transaksi (boleh lebih dari satu file)
          </label>
          <label
            htmlFor="ee-files"
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/10 px-3.5 py-4 text-sm font-medium text-zinc-500 transition-colors hover:border-violet-400 hover:text-violet-600 dark:border-white/10 dark:text-zinc-400"
          >
            <Upload className="h-4 w-4" />
            {files.length > 0 ? `${files.length} file dipilih` : "Pilih foto nota/bon/bukti transfer"}
          </label>
          <input
            id="ee-files"
            type="file"
            multiple
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600 dark:bg-white/5 dark:text-zinc-300"
                >
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="shrink-0 text-zinc-400 hover:text-rose-600"
                    aria-label={`Hapus ${f.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </p>
        )}
        {uploadWarning && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            {uploadWarning}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            {uploadWarning ? "Tutup" : "Batal"}
          </button>
          {!uploadWarning && (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              style={{ background: GRADIENT }}
            >
              {submitting ? (
                <>
                  <Receipt className="h-4 w-4 animate-pulse" />
                  Menyimpan…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Catat Pengeluaran
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
