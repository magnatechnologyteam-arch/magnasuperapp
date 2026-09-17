"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarClock, Loader2, MapPin, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/cn";
import { createEvent } from "@/lib/events/actions";
import type { EventStatus, EventSummary, EventType } from "@/lib/events/types";

const STATUS_BADGE: Record<EventStatus, string> = {
  Berjalan: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Selesai: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Dibatalkan: "bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400",
};

function emptyForm() {
  return { name: "", clientName: "", eventTypeId: "", location: "", startDate: "", endDate: "", notes: "" };
}

/**
 * Daftar Event (Tahap C modul Tracking Progress Event) -- HANYA akses
 * penuh yang bisa BIKIN event baru (RLS `events_insert`), sama seperti
 * kelola Jenis Event di Tahap B. Setelah event dibuat, staf 3 divisi
 * operasional terlibat lewat checklist & kaitan (halaman detail) --
 * mereka tidak melihat halaman daftar ini sendiri di Tahap C (menyusul di
 * Tahap D/E: Papan Tracking & Dashboard ringkasan).
 */
export function EventList({ events, eventTypes }: { events: EventSummary[]; eventTypes: EventType[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const activeTypes = eventTypes.filter((t) => t.isActive);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function openAdd() {
    setForm(emptyForm());
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Nama event wajib diisi.");
      return;
    }
    setSubmitting(true);
    const result = await createEvent({
      name: form.name,
      clientName: form.clientName,
      eventTypeId: form.eventTypeId || null,
      location: form.location,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      notes: form.notes,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    showToast("Event baru berhasil dibuat.");
    setFormOpen(false);
    router.push(`/dashboard/admin/events/${result.id}`);
  }

  return (
    <div>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <Plus className="h-4 w-4" />
          Buat Event Baru
        </button>
      </div>

      {events.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={CalendarClock}
            title="Belum ada event"
            description='Klik "Buat Event Baru" untuk mulai melacak progress event pertama.'
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => (
            <Link
              key={ev.id}
              href={`/dashboard/admin/events/${ev.id}`}
              className="rounded-2xl border border-zinc-200 bg-white p-4 transition-colors hover:border-violet-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-violet-700"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-zinc-900 dark:text-white">{ev.name}</h3>
                <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", STATUS_BADGE[ev.status])}>
                  {ev.status}
                </span>
              </div>
              {ev.clientName && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{ev.clientName}</p>}
              <div className="mt-2.5 space-y-1 text-xs text-zinc-400 dark:text-zinc-500">
                {ev.eventTypeName && <p>Jenis: {ev.eventTypeName}</p>}
                {ev.location && (
                  <p className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {ev.location}
                  </p>
                )}
                {(ev.startDate || ev.endDate) && (
                  <p className="flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    {ev.startDate ?? "?"} – {ev.endDate ?? "?"}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Buat Event Baru">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Nama Event</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="mis. Grab KOL Gathering Bandung 2026"
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Klien <span className="font-normal text-zinc-400">(opsional)</span>
              </label>
              <input
                value={form.clientName}
                onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Jenis Event <span className="font-normal text-zinc-400">(opsional)</span>
              </label>
              <select
                value={form.eventTypeId}
                onChange={(e) => setForm((f) => ({ ...f, eventTypeId: e.target.value }))}
                className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="">Tanpa jenis (checklist kosong)</option>
                {activeTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Lokasi <span className="font-normal text-zinc-400">(opsional)</span>
            </label>
            <input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Tanggal Mulai <span className="font-normal text-zinc-400">(opsional)</span>
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Tanggal Selesai <span className="font-normal text-zinc-400">(opsional)</span>
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Catatan <span className="font-normal text-zinc-400">(opsional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full resize-none rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </p>
          )}
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
            Setelah dibuat, checklist jenis event (kalau dipilih) langsung disalin ke event ini, dan Magnarent,
            Magnativ, Production akan mendapat notifikasi.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-zinc-900"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Buat Event
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
