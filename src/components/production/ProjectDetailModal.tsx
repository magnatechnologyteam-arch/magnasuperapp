"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, ChevronDown, Clock, FileText, Loader2, Paperclip, Trash2, Upload, Users } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import {
  addCrewTimelog,
  addProjectCrew,
  addProjectDocument,
  deleteCrewTimelog,
  deleteProjectCrew,
  deleteProjectDocument,
  getCrewTimelogs,
  getProjectChecks,
  getProjectCrew,
  getProjectDocuments,
  removeProjectCheckPhoto,
  saveProjectCheck,
} from "@/lib/production/extras-actions";
import {
  CREW_ROLES,
  type CheckStage,
  type CrewRole,
  type CrewTimelog,
  type ProjectCheck,
  type ProjectCrew,
  type ProjectDocument,
} from "@/lib/production/extras-types";
import { formatDateID, todayISO } from "@/lib/shared/utils";

const STAGE_LABEL: Record<CheckStage, string> = { instalasi: "Saat Instalasi", bongkar: "Saat Bongkar" };
const EMPTY_CREW_FORM = { nama: "", peran: "Tukang/Instalatur" as CrewRole, kontak: "", catatan: "" };
const EMPTY_TIMELOG_FORM = { tanggal: todayISO(), jam: "1", catatan: "" };

function CheckStagePanel({
  projectId,
  stage,
  check,
  onSaved,
}: {
  projectId: string;
  stage: CheckStage;
  check: ProjectCheck | undefined;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [catatan, setCatatan] = useState(check?.catatan ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCatatan(check?.catatan ?? "");
  }, [check?.catatan]);

  async function handleSave() {
    const formData = new FormData();
    const files = fileInputRef.current?.files;
    if (files) {
      for (const file of Array.from(files)) formData.append("photos", file);
    }
    setSubmitting(true);
    const result = await saveProjectCheck(projectId, stage, catatan, formData);
    setSubmitting(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    showToast(`Checklist "${STAGE_LABEL[stage]}" berhasil disimpan.`);
    onSaved();
  }

  async function handleRemovePhoto(url: string) {
    const result = await removeProjectCheckPhoto(projectId, stage, url);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    onSaved();
  }

  return (
    <div className="space-y-3 rounded-xl border border-black/5 p-3.5 dark:border-white/10">
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {STAGE_LABEL[stage]}
      </p>
      {check?.checkedAt && (
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Sudah dicek {new Date(check.checkedAt).toLocaleString("id-ID")}
        </p>
      )}

      {check && check.photoUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {check.photoUrls.map((url) => (
            <div key={url} className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element -- foto dari Supabase Storage */}
              <img src={url} alt="Foto checklist" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemovePhoto(url)}
                aria-label="Hapus foto ini"
                className="absolute inset-0 hidden items-center justify-center bg-black/50 text-white group-hover:flex"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        value={catatan}
        onChange={(e) => setCatatan(e.target.value)}
        rows={2}
        placeholder={`Catatan ${STAGE_LABEL[stage].toLowerCase()}…`}
        className="w-full resize-none rounded-xl border border-black/10 bg-transparent px-3.5 py-2 text-sm text-zinc-900 outline-none ring-amber-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
      />

      <div className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" id={`project-check-file-${stage}`} />
        <label
          htmlFor={`project-check-file-${stage}`}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
        >
          <Upload className="h-3.5 w-3.5" />
          Tambah Foto
        </label>
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting}
          className="ml-auto flex items-center gap-1.5 rounded-full bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Simpan
        </button>
      </div>
    </div>
  );
}

/**
 * Jam kerja kru (Tahap 44 — gap #4 analisis-gap-production.md) — panel
 * expand per baris kru, dibuka lewat toggle di `ProjectDetailModal` supaya
 * daftar kru tidak langsung penuh form jam kerja kalau belum dibutuhkan.
 * Versi INTERNAL saja: jam diisi manual staf, belum terhubung sistem
 * payroll sungguhan (lihat rekomendasi di analisis-gap-production.md).
 */
function CrewTimelogPanel({ crewId, crewName }: { crewId: string; crewName: string }) {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<CrewTimelog[] | null>(null);
  const [form, setForm] = useState(EMPTY_TIMELOG_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  function reload() {
    getCrewTimelogs(crewId).then(setLogs);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewId]);

  const totalJam = (logs ?? []).reduce((sum, l) => sum + l.jam, 0);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const jam = Number(form.jam);
    if (!form.tanggal) {
      setError("Tanggal wajib diisi.");
      return;
    }
    if (!Number.isFinite(jam) || jam <= 0) {
      setError("Jam kerja harus lebih dari 0.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await addCrewTimelog(crewId, { tanggal: form.tanggal, jam, catatan: form.catatan });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setForm(EMPTY_TIMELOG_FORM);
    reload();
    showToast(`Jam kerja ${crewName} berhasil dicatat.`);
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    const result = await deleteCrewTimelog(id);
    setRemovingId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setLogs((prev) => prev?.filter((l) => l.id !== id) ?? null);
  }

  return (
    <div className="mt-2 space-y-2.5 rounded-lg bg-zinc-50 p-3 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Riwayat Jam Kerja
        </p>
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Total {totalJam} jam</span>
      </div>

      {logs === null ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">Memuat…</p>
      ) : logs.length === 0 ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">Belum ada jam kerja tercatat.</p>
      ) : (
        <ul className="space-y-1">
          {logs.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-xs shadow-sm dark:bg-zinc-900">
              <span className="text-zinc-500 dark:text-zinc-400">{formatDateID(l.tanggal)}</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-100">{l.jam} jam</span>
              {l.catatan && <span className="min-w-0 flex-1 truncate text-zinc-400 dark:text-zinc-500">{l.catatan}</span>}
              <button
                type="button"
                onClick={() => handleRemove(l.id)}
                disabled={removingId === l.id}
                aria-label="Hapus catatan jam kerja"
                className="shrink-0 rounded-full p-1 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor={`timelog-tanggal-${crewId}`} className="mb-1 block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
            Tanggal
          </label>
          <input
            id={`timelog-tanggal-${crewId}`}
            type="date"
            value={form.tanggal}
            onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
            className="rounded-lg border border-black/10 bg-transparent px-2 py-1.5 text-xs text-zinc-900 outline-none ring-amber-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor={`timelog-jam-${crewId}`} className="mb-1 block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
            Jam
          </label>
          <input
            id={`timelog-jam-${crewId}`}
            type="number"
            min={0.5}
            step={0.5}
            value={form.jam}
            onChange={(e) => setForm((f) => ({ ...f, jam: e.target.value }))}
            className="w-16 rounded-lg border border-black/10 bg-transparent px-2 py-1.5 text-xs text-zinc-900 outline-none ring-amber-500/40 focus:ring-2 dark:border-white/10 dark:text-white"
          />
        </div>
        <input
          value={form.catatan}
          onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
          placeholder="Catatan (opsional)"
          className="min-w-0 flex-1 rounded-lg border border-black/10 bg-transparent px-2.5 py-1.5 text-xs text-zinc-900 outline-none ring-amber-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-1 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
          Catat
        </button>
      </form>
      {error && (
        <p className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Lampiran gambar kerja/desain (Tahap 44 — gap #6 analisis-gap-production.md)
 * — denah, rendering, shop drawing per proyek. TERPISAH dari dokumentasi
 * before/after instalasi (bucket & tabel beda) karena tujuannya beda: ini
 * arsip kerja tim desain/produksi, bukan bukti hasil akhir ke klien.
 * Mendukung file gambar ATAU PDF, staf saja yang bisa unggah/lihat untuk
 * sekarang (sama seperti seluruh modul Production — belum ada portal
 * klien, lihat rekomendasi Prioritas Tinggi #6 di gap report).
 */
function ProjectDocumentsSection({ projectId }: { projectId: string }) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<ProjectDocument[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  function reload() {
    getProjectDocuments(projectId).then(setDocs);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("file", file);
    setUploading(true);
    const result = await addProjectDocument(formData);
    setUploading(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    reload();
    showToast(`"${file.name}" berhasil diunggah.`);
  }

  async function handleRemove(doc: ProjectDocument) {
    setRemovingId(doc.id);
    const result = await deleteProjectDocument(doc.id);
    setRemovingId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setDocs((prev) => prev?.filter((d) => d.id !== doc.id) ?? null);
    showToast(`"${doc.fileName}" berhasil dihapus.`);
  }

  return (
    <div className="mt-5 border-t border-black/5 pt-4 dark:border-white/10">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        <Paperclip className="h-3.5 w-3.5" />
        Lampiran Gambar Kerja/Desain
      </p>

      {docs === null ? (
        <p className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-500">Memuat…</p>
      ) : docs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/10 px-3.5 py-3 text-xs text-zinc-400 dark:border-white/10">
          Belum ada lampiran gambar kerja/desain untuk proyek ini.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 rounded-xl border border-black/5 px-3 py-2 dark:border-white/10">
              <a
                href={d.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 items-center gap-2 text-xs font-medium text-zinc-700 hover:underline dark:text-zinc-200"
              >
                <FileText className="h-4 w-4 shrink-0 text-zinc-400" />
                <span className="truncate">{d.fileName}</span>
              </a>
              <button
                type="button"
                onClick={() => handleRemove(d)}
                disabled={removingId === d.id}
                aria-label={`Hapus lampiran ${d.fileName}`}
                className="shrink-0 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
          id="project-document-file"
        />
        <label
          htmlFor="project-document-file"
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Mengunggah…" : "Unggah Gambar/PDF"}
        </label>
      </div>
    </div>
  );
}

/**
 * Detail proyek booth (Tahap 28c) — gabungan checklist instalasi & bongkar
 * (dengan foto) DAN penugasan kru, dibuka lewat satu tombol baru di
 * `BoothProjectManager` supaya tidak perlu dua tombol terpisah di baris
 * tabel yang sudah cukup padat. Datanya di-fetch on-demand tiap modal
 * dibuka, sama persis polanya dengan `BookingConditionModal` Magnarent.
 */
export function ProjectDetailModal({
  projectId,
  projectName,
  open,
  onClose,
}: {
  projectId: string;
  projectName: string;
  open: boolean;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [checks, setChecks] = useState<ProjectCheck[] | null>(null);
  const [crew, setCrew] = useState<ProjectCrew[] | null>(null);
  const [crewForm, setCrewForm] = useState(EMPTY_CREW_FORM);
  const [crewError, setCrewError] = useState<string | null>(null);
  const [addingCrew, setAddingCrew] = useState(false);
  const [removingCrewId, setRemovingCrewId] = useState<string | null>(null);
  const [expandedCrewId, setExpandedCrewId] = useState<string | null>(null);

  function reloadChecks() {
    getProjectChecks(projectId).then(setChecks);
  }

  function reloadCrew() {
    getProjectCrew(projectId).then(setCrew);
  }

  useEffect(() => {
    if (!open) return;
    reloadChecks();
    reloadCrew();
    setCrewForm(EMPTY_CREW_FORM);
    setCrewError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  async function handleAddCrew(e: FormEvent) {
    e.preventDefault();
    if (!crewForm.nama.trim()) {
      setCrewError("Nama kru wajib diisi.");
      return;
    }
    setCrewError(null);
    setAddingCrew(true);
    const result = await addProjectCrew(projectId, {
      nama: crewForm.nama,
      peran: crewForm.peran,
      kontak: crewForm.kontak,
      catatan: crewForm.catatan,
    });
    setAddingCrew(false);

    if (!result.ok) {
      setCrewError(result.error);
      return;
    }
    setCrewForm(EMPTY_CREW_FORM);
    reloadCrew();
    showToast(`Kru "${crewForm.nama.trim()}" berhasil ditambahkan.`);
  }

  async function handleRemoveCrew(id: string, nama: string) {
    setRemovingCrewId(id);
    const result = await deleteProjectCrew(id);
    setRemovingCrewId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setCrew((prev) => prev?.filter((c) => c.id !== id) ?? null);
    showToast(`Kru "${nama}" berhasil dihapus dari proyek.`);
  }

  const checkByStage = (stage: CheckStage) => checks?.find((c) => c.stage === stage);

  return (
    <Modal open={open} onClose={onClose} title={`Detail Proyek — ${projectName}`} maxWidth="max-w-xl">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Checklist Instalasi & Bongkar
        </p>
        {checks === null ? (
          <p className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-500">Memuat…</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <CheckStagePanel projectId={projectId} stage="instalasi" check={checkByStage("instalasi")} onSaved={reloadChecks} />
            <CheckStagePanel projectId={projectId} stage="bongkar" check={checkByStage("bongkar")} onSaved={reloadChecks} />
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-black/5 pt-4 dark:border-white/10">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          <Users className="h-3.5 w-3.5" />
          Kru Proyek
        </p>

        {crew === null ? (
          <p className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-500">Memuat…</p>
        ) : crew.length === 0 ? (
          <p className="rounded-xl border border-dashed border-black/10 px-3.5 py-3 text-xs text-zinc-400 dark:border-white/10">
            Belum ada kru ditugaskan ke proyek ini.
          </p>
        ) : (
          <div className="space-y-2">
            {crew.map((c) => {
              const isExpanded = expandedCrewId === c.id;
              return (
                <div key={c.id} className="rounded-xl border border-black/5 px-3 py-2.5 dark:border-white/10">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedCrewId(isExpanded ? null : c.id)}
                      className="flex min-w-0 flex-1 items-start gap-1.5 text-left"
                    >
                      <ChevronDown
                        className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                      <span className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                          {c.nama} <span className="font-normal text-zinc-400 dark:text-zinc-500">— {c.peran}</span>
                        </p>
                        {c.kontak && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{c.kontak}</p>}
                        {c.catatan && <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{c.catatan}</p>}
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setExpandedCrewId(isExpanded ? null : c.id)}
                        title="Jam kerja"
                        aria-label={`Jam kerja ${c.nama}`}
                        className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
                      >
                        <Clock className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveCrew(c.id, c.nama)}
                        disabled={removingCrewId === c.id}
                        aria-label={`Hapus kru ${c.nama}`}
                        className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {isExpanded && <CrewTimelogPanel crewId={c.id} crewName={c.nama} />}
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={handleAddCrew} className="mt-3 space-y-3 rounded-xl border border-black/5 p-3.5 dark:border-white/10">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="crew-nama" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Nama Kru
              </label>
              <input
                id="crew-nama"
                value={crewForm.nama}
                onChange={(e) => setCrewForm((f) => ({ ...f, nama: e.target.value }))}
                placeholder="mis. Budi Santoso"
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2 text-sm text-zinc-900 outline-none ring-amber-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="crew-peran" className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Peran
              </label>
              <select
                id="crew-peran"
                value={crewForm.peran}
                onChange={(e) => setCrewForm((f) => ({ ...f, peran: e.target.value as CrewRole }))}
                className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2 text-sm text-zinc-900 outline-none ring-amber-500/40 focus:ring-2 dark:border-white/10 dark:text-white dark:[&>option]:bg-zinc-900"
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
            value={crewForm.kontak}
            onChange={(e) => setCrewForm((f) => ({ ...f, kontak: e.target.value }))}
            placeholder="Kontak (opsional) — mis. 0812xxxxxxx"
            className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2 text-sm text-zinc-900 outline-none ring-amber-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
          />
          <input
            value={crewForm.catatan}
            onChange={(e) => setCrewForm((f) => ({ ...f, catatan: e.target.value }))}
            placeholder="Catatan (opsional) — mis. bertugas hari H saja"
            className="w-full rounded-xl border border-black/10 bg-transparent px-3.5 py-2 text-sm text-zinc-900 outline-none ring-amber-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:text-white"
          />

          {crewError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
              {crewError}
            </p>
          )}

          <button
            type="submit"
            disabled={addingCrew}
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
          >
            {addingCrew && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Tambah Kru
          </button>
        </form>
      </div>

      <ProjectDocumentsSection projectId={projectId} />
    </Modal>
  );
}
