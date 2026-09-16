"use client";

import { useMemo, useState } from "react";
import { Plus, Receipt, Search, Trash2 } from "lucide-react";
import { EventExpenseFormModal } from "./EventExpenseFormModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { formatDateID, formatRupiah } from "@/lib/shared/utils";
import { deleteEventExpense } from "@/lib/event-expenses/actions";
import { EXPENSE_CATEGORIES, EXPENSE_DIVISION_LABELS, type EventExpense, type ExpenseDivision, type ExpenseSourceOption } from "@/lib/event-expenses/types";

const GRADIENT = "linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)";

const REIMBURSE_BADGE: Record<string, string> = {
  "Tidak Perlu": "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
  "Belum Diganti": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  "Sudah Diganti": "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
};

/**
 * Manajer utama halaman "Realisasi Event" — daftar pengeluaran + form
 * catat baru + hapus. Pola state sama seperti `ProductManager.tsx`
 * (single-page, tanpa DataProvider bersama): mulai dari `initialExpenses`
 * lewat props (Server Component), lalu dikelola lokal (`useState`) dan
 * diperbarui optimis begitu Server Action berhasil — TIDAK menunggu
 * `router.refresh()`, supaya terasa instan.
 */
export function EventExpenseManager({
  initialExpenses,
  sourceOptions,
}: {
  initialExpenses: EventExpense[];
  sourceOptions: ExpenseSourceOption[];
}) {
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState(initialExpenses);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventExpense | null>(null);
  const [divisionFilter, setDivisionFilter] = useState<ExpenseDivision | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const sourceLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of sourceOptions) map.set(`${opt.sourceType}::${opt.sourceId ?? "umum"}`, opt.label);
    return map;
  }, [sourceOptions]);

  function labelFor(expense: EventExpense) {
    return sourceLabelByKey.get(`${expense.sourceType}::${expense.sourceId ?? "umum"}`) ?? "—";
  }

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return expenses.filter((e) => {
      if (divisionFilter !== "all" && e.division !== divisionFilter) return false;
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
      if (!term) return true;
      return (
        e.picName.toLowerCase().includes(term) ||
        (e.notes ?? "").toLowerCase().includes(term) ||
        labelFor(e).toLowerCase().includes(term)
      );
    });
  }, [expenses, divisionFilter, categoryFilter, searchTerm]);

  const total = useMemo(() => filtered.reduce((sum, e) => sum + e.amount, 0), [filtered]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    const result = await deleteEventExpense(deleteTarget.id);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setExpenses((prev) => prev.filter((e) => e.id !== deleteTarget.id));
    setDeleteTarget(null);
    showToast("Pengeluaran berhasil dihapus.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari PIC, keterangan, event…"
              className="w-56 rounded-full border border-black/10 bg-white py-2 pl-9 pr-3.5 text-sm text-zinc-900 outline-none ring-violet-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
            />
          </div>
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value as ExpenseDivision | "all")}
            className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-sm text-zinc-700 outline-none dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <option value="all">Semua Divisi</option>
            {Object.entries(EXPENSE_DIVISION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-sm text-zinc-700 outline-none dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <option value="all">Semua Kategori</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm"
          style={{ background: GRADIENT }}
        >
          <Plus className="h-4 w-4" />
          Catat Pengeluaran
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Belum ada pengeluaran tercatat"
            description={'Catat pengeluaran pertama lewat tombol "Catat Pengeluaran" di atas.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:border-white/10 dark:text-zinc-500">
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Divisi</th>
                  <th className="px-4 py-3">Event/Proyek</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">PIC</th>
                  <th className="px-4 py-3 text-right">Nominal</th>
                  <th className="px-4 py-3">Metode</th>
                  <th className="px-4 py-3">Penggantian</th>
                  <th className="px-4 py-3">Bukti</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filtered.map((e) => (
                  <tr key={e.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {formatDateID(e.expenseDate)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{EXPENSE_DIVISION_LABELS[e.division]}</td>
                    <td className="max-w-[180px] px-4 py-3 text-zinc-800 dark:text-zinc-100">{labelFor(e)}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{e.category}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{e.picName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-zinc-900 dark:text-white">
                      {formatRupiah(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{e.paymentMethod}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${REIMBURSE_BADGE[e.reimbursementStatus]}`}>
                        {e.reimbursementStatus}
                      </span>
                    </td>
                    <td className="max-w-[160px] px-4 py-3">
                      {e.proofs.length === 0 ? (
                        <span className="text-xs italic text-rose-500">Belum diunggah</span>
                      ) : (
                        <ul className="space-y-0.5">
                          {e.proofs.map((p) => (
                            <li key={p.id}>
                              <a
                                href={p.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block truncate text-xs text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
                                title={p.fileName}
                              >
                                {p.fileName}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(e)}
                        title="Hapus pengeluaran"
                        aria-label="Hapus pengeluaran"
                        className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-black/5 bg-zinc-50 font-semibold dark:border-white/10 dark:bg-white/5">
                  <td colSpan={5} className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                    Total ({filtered.length} pengeluaran)
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-white">
                    {formatRupiah(total)}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <EventExpenseFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        sourceOptions={sourceOptions}
        onCreated={(expense) => {
          setExpenses((prev) => [expense, ...prev]);
          showToast("Pengeluaran berhasil dicatat.");
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Hapus Pengeluaran"
        description={
          deleteTarget
            ? `Hapus pengeluaran "${deleteTarget.category}" sebesar ${formatRupiah(deleteTarget.amount)}? Bukti transaksi yang sudah diunggah juga akan ikut terhapus. Tindakan ini tidak bisa dibatalkan.`
            : undefined
        }
      />
    </div>
  );
}
