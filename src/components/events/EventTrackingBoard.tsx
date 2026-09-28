"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, History, Link2, MapPin, MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/cn";
import { updateEventChecklistProgress } from "@/lib/events/actions";
import { ChecklistHistoryModal } from "./ChecklistHistoryModal";
import { ChecklistDiscussionModal } from "./ChecklistDiscussionModal";
import { ChecklistProgressRing } from "./ChecklistProgressRing";
import {
  EVENT_CHECKLIST_STATUSES,
  EVENT_SOURCE_LABELS,
  type EventChecklistItem,
  type EventChecklistStatus,
  type EventLink,
  type EventSummary,
  type PicOption,
} from "@/lib/events/types";
import { GLASS_BORDER, GLASS_SURFACE } from "@/lib/glass";

const STATUS_BADGE: Record<string, string> = {
  Berjalan: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Selesai: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Dibatalkan: "bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400",
};

const CHECKLIST_STATUS_STYLE: Record<EventChecklistStatus, string> = {
  "Belum Mulai": "border-zinc-300 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400",
  Sample: "border-amber-300 text-amber-700 dark:border-amber-500/40 dark:text-amber-300",
  Approval: "border-orange-300 text-orange-700 dark:border-orange-500/40 dark:text-orange-300",
  Preparation: "border-sky-300 text-sky-700 dark:border-sky-500/40 dark:text-sky-300",
  Production: "border-violet-300 text-violet-700 dark:border-violet-500/40 dark:text-violet-300",
  Finish: "border-emerald-300 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-300",
};

const DIVISION_LABEL: Record<string, string> = {
  magnarent: "Magnarent",
  magnative: "Magnativ",
  production: "Production",
  all: "Admin/Owner",
};

/**
 * "Papan Tracking" (Tahap D) -- halaman TERBUKA untuk 3 divisi operasional
 * + akses penuh, dipakai update status & PIC tiap item checklist secara
 * bersama-sama (RLS `event_checklist_items_update` sudah membuka ini sejak
 * migrasi 0053). SENGAJA tidak ada fitur tambah/hapus item atau kelola
 * kaitan di sini -- itu tetap milik halaman detail Admin
 * (`/dashboard/admin/events/[id]`, Tahap C) supaya struktur checklist
 * (kategori/nama/detail) tidak berubah-ubah di tengah divisi lagi kerja.
 */
export function EventTrackingBoard({
  event,
  initialChecklistItems,
  links,
  picOptions,
}: {
  event: EventSummary;
  initialChecklistItems: EventChecklistItem[];
  links: EventLink[];
  picOptions: PicOption[];
}) {
  const { showToast } = useToast();
  const [items, setItems] = useState(initialChecklistItems);
  useEffect(() => setItems(initialChecklistItems), [initialChecklistItems]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [historyTarget, setHistoryTarget] = useState<EventChecklistItem | null>(null);
  const [discussionTarget, setDiscussionTarget] = useState<EventChecklistItem | null>(null);

  const groupedItems = useMemo(() => {
    const map = new Map<string, EventChecklistItem[]>();
    for (const item of [...items].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const bucket = map.get(item.category) ?? [];
      bucket.push(item);
      map.set(item.category, bucket);
    }
    // Tahap 49: hitung juga progres per kategori (bukan cuma per event) --
    // dipakai buat badge kecil "x/y" di sebelah tiap judul kategori, biar
    // staf langsung tahu kategori mana yang masih tertinggal tanpa harus
    // scroll baca satu-satu itemnya.
    return Array.from(map.entries()).map(([category, list]) => ({
      category,
      list,
      done: list.filter((i) => i.status === "Finish").length,
    }));
  }, [items]);

  const progressPct = useMemo(() => {
    if (items.length === 0) return 0;
    const done = items.filter((i) => i.status === "Finish").length;
    return Math.round((done / items.length) * 100);
  }, [items]);

  async function handleUpdate(
    item: EventChecklistItem,
    patch: { status?: EventChecklistStatus; picId?: string | null }
  ) {
    const nextStatus = patch.status ?? item.status;
    const nextPicId = patch.picId !== undefined ? patch.picId : item.pic ?? null;

    setSavingId(item.id);
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              status: nextStatus,
              pic: nextPicId ?? undefined,
              picName: nextPicId ? picOptions.find((p) => p.id === nextPicId)?.fullName : undefined,
            }
          : i
      )
    );

    const result = await updateEventChecklistProgress(item.id, item.eventId, {
      status: nextStatus,
      picId: nextPicId,
    });
    setSavingId(null);

    if (!result.ok) {
      showToast(result.error, "error");
      setItems(initialChecklistItems);
      return;
    }
    showToast("Progress disimpan.");
  }

  return (
    <div className="space-y-6">
      <section className={cn("rounded-2xl border p-5", GLASS_SURFACE, GLASS_BORDER)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{event.name}</h2>
            {event.clientName && <p className="text-sm text-zinc-500 dark:text-zinc-400">{event.clientName}</p>}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 dark:text-zinc-500">
              {event.eventTypeName && <span>Jenis: {event.eventTypeName}</span>}
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {event.location}
                </span>
              )}
              {(event.startDate || event.endDate) && (
                <span>
                  {event.startDate ?? "?"} – {event.endDate ?? "?"}
                </span>
              )}
            </div>
          </div>
          <span className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", STATUS_BADGE[event.status])}>
            {event.status}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-4 border-t border-zinc-100 pt-4 dark:border-white/10">
          <ChecklistProgressRing percent={progressPct} size={56} strokeWidth={6} />
          <div>
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Progress checklist</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {items.filter((i) => i.status === "Finish").length}/{items.length} item selesai
            </p>
          </div>
        </div>
      </section>

      {links.length > 0 && (
        <section className={cn("rounded-2xl border p-5", GLASS_SURFACE, GLASS_BORDER)}>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Kaitan ke Data Divisi</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {links.map((link) => (
              <span
                key={link.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs dark:border-zinc-700 dark:bg-white/5"
              >
                <Link2 className="h-3 w-3 text-zinc-400" />
                <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                  {EVENT_SOURCE_LABELS[link.sourceType]}:
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">{link.sourceLabel}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <section className={cn("rounded-2xl border p-5", GLASS_SURFACE, GLASS_BORDER)}>
        <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Checklist</h2>
        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
          Update status & PIC tiap item sesuai progres pekerjaan divisimu -- bisa diisi bersama staf divisi lain.
        </p>

        {groupedItems.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Checklist masih kosong"
            description="Admin belum mengisi checklist untuk event ini."
          />
        ) : (
          <div className="mt-4 space-y-6">
            {groupedItems.map(({ category, list, done }) => (
              <div key={category}>
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    {category}
                  </p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold",
                      done === list.length
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-400"
                    )}
                  >
                    {done}/{list.length}
                  </span>
                </div>
                {/* Tahap 49: sebelumnya <table> yang wajib overflow-x-scroll
                    (min-w-[720px]) supaya 7 kolomnya muat -- di layar sempit
                    jadi kepotong & harus digeser. Diganti daftar kartu
                    (setiap item = satu baris kaca) yang boleh melebar penuh
                    di layar besar dan menumpuk vertikal di layar kecil,
                    tanpa scroll horizontal sama sekali. */}
                <div className="space-y-2">
                  {list.map((item) => (
                    <div key={item.id} className={cn("rounded-2xl border p-3.5", GLASS_SURFACE, GLASS_BORDER)}>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-zinc-700 dark:text-zinc-200">{item.itemName}</p>
                          {(item.detail || item.qtyInfo) && (
                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                              {[item.detail, item.qtyInfo].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          {item.notes && (
                            <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">{item.notes}</p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={item.status}
                            disabled={savingId === item.id}
                            onChange={(e) =>
                              handleUpdate(item, { status: e.target.value as EventChecklistStatus })
                            }
                            className={cn(
                              "rounded-lg border bg-transparent px-2 py-1 text-xs font-semibold dark:bg-zinc-950",
                              CHECKLIST_STATUS_STYLE[item.status]
                            )}
                          >
                            {EVENT_CHECKLIST_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <select
                            value={item.pic ?? ""}
                            disabled={savingId === item.id}
                            onChange={(e) => handleUpdate(item, { picId: e.target.value || null })}
                            className="max-w-[9.5rem] rounded-lg border border-zinc-300 bg-transparent px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                          >
                            <option value="">Belum ditugaskan</option>
                            {picOptions.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.fullName} ({DIVISION_LABEL[p.division] ?? p.division})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setHistoryTarget(item)}
                            title="Lihat riwayat status & PIC"
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-semibold text-zinc-500 transition-colors hover:border-violet-300 hover:text-violet-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-violet-700 dark:hover:text-violet-300"
                          >
                            <History className="h-3 w-3" />
                            <span className="hidden sm:inline">Riwayat</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiscussionTarget(item)}
                            title="Diskusi item ini"
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-semibold text-zinc-500 transition-colors hover:border-violet-300 hover:text-violet-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-violet-700 dark:hover:text-violet-300"
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span className="hidden sm:inline">Diskusi</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {historyTarget && (
        <ChecklistHistoryModal
          checklistItemId={historyTarget.id}
          itemName={historyTarget.itemName}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      {discussionTarget && (
        <ChecklistDiscussionModal
          checklistItemId={discussionTarget.id}
          itemName={discussionTarget.itemName}
          onClose={() => setDiscussionTarget(null)}
        />
      )}
    </div>
  );
}
