"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Trash2, Users } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import {
  addCrewAssignment,
  deleteCrewAssignment,
  findCrewConflicts,
  getCrewAssignments,
} from "@/lib/magnarent/extras-actions";
import { CREW_ROLES, type CrewAssignment, type CrewConflict, type CrewRole } from "@/lib/magnarent/extras-types";

function emptyForm() {
  return { crewName: "", role: "Sopir" as CrewRole, catatan: "" };
}

/**
 * Crew/labor scheduling per booking (Gap laporan Bagian 5-C) -- daftar
 * kru yang ditugaskan (sopir, rigger, teknisi, dll), plus cek bentrok
 * jadwal heuristik (overlap tanggal booking, BUKAN AI) yang dijalankan
 * saat nama kru diketik, sebelum staf menyimpan.
 */
export function CrewAssignmentModal({
  bookingId,
  clientName,
  onClose,
}: {
  bookingId: string;
  clientName: string;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [crew, setCrew] = useState<CrewAssignment[] | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [conflicts, setConflicts] = useState<CrewConflict[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CrewAssignment | null>(null);

  function reload() {
    getCrewAssignments(bookingId).then(setCrew);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  async function handleCheckConflicts() {
    if (!form.crewName.trim()) return;
    setCheckingConflicts(true);
    const result = await findCrewConflicts(bookingId, form.crewName);
    setCheckingConflicts(false);
    setConflicts(result);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.crewName.trim()) {
      setError("Nama kru wajib diisi.");
      return;
    }
    setSubmitting(true);
    const result = await addCrewAssignment(bookingId, form);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    showToast("Kru berhasil ditugaskan.");
    setForm(emptyForm());
    setConflicts([]);
    setError(null);
    reload();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const result = await deleteCrewAssignment(deleteTarget.id);
    if (!result.ok) {
      showToast(result.error, "error");
      setDeleteTarget(null);
      return;
    }
    showToast(`Penugasan "${deleteTarget.crewName}" berhasil dihapus.`);
    setDeleteTarget(null);
    reload();
  }

  return (
    <Modal open onClose={onClose} title={`Kru Bertugas — ${clientName}`}>
      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-black/5 p-3.5 dark:border-white/10">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Nama Kru</label>
              <input
                value={form.crewName}
                onChange={(e) => {
                  setForm((f) => ({ ...f, crewName: e.target.value }));
                  setConflicts([]);
                }}
                onBlur={handleCheckConflicts}
                placeholder="mis. Budi"
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2 text-sm text-zinc-900 outline-none ring-orange-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Peran</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as CrewRole }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2 text-sm text-zinc-900 outline-none ring-orange-500/40 focus:ring-2 dark:border-white/10 dark:text-white dark:[&>option]:bg-zinc-900"
              >
                {CREW_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <input
            value={form.catatan}
            onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
            placeholder="Catatan (opsional)"
            className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2 text-sm text-zinc-900 outline-none ring-orange-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
          />

          {checkingConflicts && <p className="text-xs text-zinc-400">Mengecek bentrok jadwal…</p>}
          {conflicts.length > 0 && (
            <div className="space-y-1 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <p className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />
                Bentrok jadwal terdeteksi
              </p>
              {conflicts.map((c) => (
                <p key={c.bookingId}>
                  {form.crewName} juga bertugas ({c.role}) untuk <strong>{c.namaKlien}</strong> pada{" "}
                  {c.tanggalMulai} – {c.tanggalSelesai}.
                </p>
              ))}
              <p className="text-amber-600/80 dark:text-amber-300/70">
                Tetap bisa disimpan — ini hanya peringatan, bukan pembatasan otomatis.
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-orange-500 px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Menyimpan…" : "+ Tugaskan Kru"}
            </button>
          </div>
        </form>

        <div className="max-h-64 space-y-2 overflow-y-auto">
          {crew === null && <p className="py-4 text-center text-sm text-zinc-400">Memuat…</p>}
          {crew?.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-black/10 py-6 text-center dark:border-white/10">
              <Users className="h-7 w-7 text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Belum ada kru ditugaskan.</p>
            </div>
          )}
          {crew?.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-black/5 p-2.5 dark:border-white/10"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{c.crewName}</p>
                <p className="text-xs text-zinc-400">
                  {c.role}
                  {c.catatan ? ` — ${c.catatan}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(c)}
                aria-label="Hapus penugasan"
                className="shrink-0 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Hapus Penugasan Kru"
        description={
          deleteTarget && (
            <>
              Yakin hapus penugasan <strong>{deleteTarget.crewName}</strong>?
            </>
          )
        }
      />
    </Modal>
  );
}
