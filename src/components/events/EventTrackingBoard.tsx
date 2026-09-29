"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ChevronDown, ClipboardList, History, Link2, MapPin, MessageSquare, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/cn";
import {
  approveChecklistPhaseReview,
  bulkAdvanceChecklistPhase,
  confirmChecklistCompleted,
  markProductionDone,
  setChecklistNeedsProduction,
  submitChecklistPhaseReview,
  updateChecklistProduction,
  updateEventChecklistProgress,
} from "@/lib/events/actions";
import { ChecklistHistoryModal } from "./ChecklistHistoryModal";
import { ChecklistDiscussionModal } from "./ChecklistDiscussionModal";
import { ChecklistProgressRing } from "./ChecklistProgressRing";
import {
  CHECKLIST_PHASES,
  CHECKLIST_PHASE_LABELS,
  CHECKLIST_REVIEW_PHASES,
  CHECKLIST_SUB_STATUS_LABELS,
  EVENT_SOURCE_LABELS,
  computeChecklistItemProgress,
  type ChecklistPhase,
  type ChecklistPhaseReview,
  type ChecklistReviewPhase,
  type EventChecklistItem,
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

const DIVISION_LABEL: Record<string, string> = {
  magnarent: "Magnarent",
  magnative: "Magnativ",
  production: "Production",
  all: "Admin/Owner",
};

const BTN =
  "inline-flex items-center justify-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 transition-colors hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-violet-700 dark:hover:text-violet-300";
const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400";
const INPUT_XS =
  "rounded-lg border border-zinc-300 bg-transparent px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950";

/** "PIC yang bertanggung jawab" (keputusan Owner) -- akses penuh selalu
 * boleh override, dipakai di semua kartu aksi fase + seleksi bulk loading. */
function canActOnItem(item: EventChecklistItem, currentUserId: string | null, isFullAccess: boolean): boolean {
  if (isFullAccess) return true;
  if (!currentUserId) return false;
  return item.pic === currentUserId;
}

/** Tombol kamera terintegrasi -- input file disembunyikan, tombol
 * bergaya memicu `capture="environment"` supaya langsung buka kamera
 * di HP dan tidak terasa seperti dialog cari file biasa. */
function PhotoCaptureButton({
  file,
  onSelect,
  disabled,
  label,
}: {
  file: File | null;
  onSelect: (file: File | null) => void;
  disabled?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled}
        onChange={(e) => {
          onSelect(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
        className="hidden"
      />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled} className={BTN}>
        <Camera className="h-3.5 w-3.5" />
        {label ?? "Ambil Foto"}
      </button>
      {file && (
        <span className="max-w-[9rem] truncate text-[11px] text-zinc-500 dark:text-zinc-400" title={file.name}>
          {file.name}
        </span>
      )}
    </div>
  );
}

/** Ringkasan visual posisi item di alur 8-fase (atau 4-fase kalau
 * `needsProduction=false`, lompat langsung dari Completed). */
function PhaseStepper({ item }: { item: EventChecklistItem }) {
  const seq: ChecklistPhase[] = item.needsProduction
    ? CHECKLIST_PHASES
    : ["completed", "loading_in", "loading_out", "finish"];
  const currentIdx = seq.indexOf(item.currentPhase);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {seq.map((phase, i) => (
        <span
          key={phase}
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            i < currentIdx
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : i === currentIdx
                ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                : "bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500"
          )}
        >
          {CHECKLIST_PHASE_LABELS[phase]}
        </span>
      ))}
    </div>
  );
}

/** Kartu aksi Design/Mockup/Sample -- siklus Proposed -> Revised ->
 * Approved, foto WAJIB sebelum fase berikutnya terbuka (keputusan Owner). */
function ReviewPhaseCard({
  item,
  phase,
  review,
  canAct,
  eventId,
  onChanged,
}: {
  item: EventChecklistItem;
  phase: ChecklistReviewPhase;
  review: ChecklistPhaseReview | undefined;
  canAct: boolean;
  eventId: string;
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const subStatus = review?.subStatus;

  function submit() {
    if (!file) return;
    const fd = new FormData();
    fd.set("itemId", item.id);
    fd.set("eventId", eventId);
    fd.set("phase", phase);
    fd.set("file", file);
    startTransition(async () => {
      const result = await submitChecklistPhaseReview(fd);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast("Foto tersimpan.");
      setFile(null);
      onChanged();
    });
  }

  function approve() {
    startTransition(async () => {
      const result = await approveChecklistPhaseReview(item.id, eventId, phase);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast(`${CHECKLIST_PHASE_LABELS[phase]} disetujui.`);
      onChanged();
    });
  }

  return (
    <div className="mt-2 rounded-xl border border-zinc-100 p-3 dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {CHECKLIST_PHASE_LABELS[phase]}
        </p>
        {subStatus && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
            {CHECKLIST_SUB_STATUS_LABELS[subStatus]}
            {review && review.revisionCount > 0 ? ` (revisi ${review.revisionCount})` : ""}
          </span>
        )}
      </div>

      {review?.photoUrl && (
        <a href={review.photoUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={review.photoUrl} alt="Foto konfirmasi" className="h-16 w-16 rounded-lg object-cover" />
        </a>
      )}

      {!canAct ? (
        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
          Menunggu PIC ({item.picName ?? "belum ditugaskan"}).
        </p>
      ) : subStatus === "approved" ? (
        <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">Disetujui.</p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <PhotoCaptureButton
            file={file}
            onSelect={setFile}
            disabled={pending}
            label={review ? "Ambil Ulang Foto" : "Ambil Foto"}
          />
          <button type="button" onClick={submit} disabled={pending || !file} className={BTN}>
            {review ? "Simpan Revisi" : "Kirim"}
          </button>
          {review?.photoUrl && (
            <button type="button" onClick={approve} disabled={pending} className={BTN_PRIMARY}>
              Setujui
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Kartu aksi fase Production -- draft qty/catatan/foto bisa disimpan
 * berkali-kali, "Tandai Selesai" baru aktif setelah ada foto tersimpan. */
function ProductionCard({
  item,
  eventId,
  canAct,
  onChanged,
}: {
  item: EventChecklistItem;
  eventId: string;
  canAct: boolean;
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [qty, setQty] = useState(item.productionQty ?? "");
  const [notes, setNotes] = useState(item.productionNotes ?? "");
  const [file, setFile] = useState<File | null>(null);

  function saveDraft() {
    const fd = new FormData();
    fd.set("itemId", item.id);
    fd.set("eventId", eventId);
    fd.set("qty", qty);
    fd.set("notes", notes);
    if (file) fd.set("file", file);
    startTransition(async () => {
      const result = await updateChecklistProduction(fd);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast("Draft produksi disimpan.");
      setFile(null);
      onChanged();
    });
  }

  function markDone() {
    startTransition(async () => {
      const result = await markProductionDone(item.id, eventId);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast("Production selesai.");
      onChanged();
    });
  }

  if (!canAct) {
    return (
      <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
        Menunggu PIC ({item.picName ?? "belum ditugaskan"}) mengisi Production.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-zinc-100 p-3 dark:border-white/10">
      <div className="flex flex-wrap gap-2">
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="Qty"
          disabled={pending}
          className={cn(INPUT_XS, "w-20")}
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Catatan produksi"
          disabled={pending}
          className={cn(INPUT_XS, "min-w-[8rem] flex-1")}
        />
        <PhotoCaptureButton file={file} onSelect={setFile} disabled={pending} label="Ambil Foto Produksi" />
      </div>
      {item.productionPhotoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.productionPhotoUrl} alt="Foto produksi" className="h-16 w-16 rounded-lg object-cover" />
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={saveDraft} disabled={pending} className={BTN}>
          Simpan Draft
        </button>
        <button
          type="button"
          onClick={markDone}
          disabled={pending || !item.productionPhotoUrl}
          title={!item.productionPhotoUrl ? "Simpan draft dengan foto dulu" : undefined}
          className={BTN_PRIMARY}
        >
          Tandai Selesai
        </button>
      </div>
    </div>
  );
}

/** Kartu aksi fase Completed -- cuma konfirmasi, tanpa foto (berlaku sama
 * untuk item `needsProduction` true maupun false, keputusan Owner). */
function CompletedCard({
  item,
  eventId,
  canAct,
  onChanged,
}: {
  item: EventChecklistItem;
  eventId: string;
  canAct: boolean;
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();

  if (!canAct) {
    return (
      <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
        Menunggu konfirmasi PIC ({item.picName ?? "belum ditugaskan"}).
      </p>
    );
  }

  function confirm() {
    startTransition(async () => {
      const result = await confirmChecklistCompleted(item.id, eventId);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast("Completed dikonfirmasi.");
      onChanged();
    });
  }

  return (
    <button type="button" onClick={confirm} disabled={pending} className={cn(BTN_PRIMARY, "mt-2")}>
      Konfirmasi Completed
    </button>
  );
}

const BULK_STAGES: { target: "loading_in" | "loading_out" | "finish"; predecessor: ChecklistPhase; label: string }[] = [
  { target: "loading_in", predecessor: "completed", label: "Loading In (mulai dibawa ke lokasi event)" },
  { target: "loading_out", predecessor: "loading_in", label: "Loading Out (pulang dari lokasi event)" },
  { target: "finish", predecessor: "loading_out", label: "Finish" },
];

/** Ditandai sekaligus (keputusan Owner: "ditandai sekaligus") tapi SEMUA
 * item event ditampilkan (bukan cuma yang siap) supaya tidak ada yang
 * terlewat -- checkbox cuma aktif untuk item yang fasenya sudah pas DAN
 * PIC-nya pengguna ini (atau akses penuh), sisanya tetap terlihat dengan
 * keterangan kenapa belum bisa ditandai. */
function BulkLoadingSection({
  items,
  eventId,
  currentUserId,
  isFullAccess,
  onChanged,
}: {
  items: EventChecklistItem[];
  eventId: string;
  currentUserId: string | null;
  isFullAccess: boolean;
  onChanged: () => void;
}) {
  return (
    <section className={cn("rounded-2xl border p-5", GLASS_SURFACE, GLASS_BORDER)}>
      <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Loading &amp; Finish</h2>
      <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
        Tandai sekaligus per tahap -- semua item ditampilkan supaya tidak ada yang terlewat.
      </p>
      <div className="mt-4 space-y-6">
        {BULK_STAGES.map((stage) => (
          <BulkStageGroup
            key={stage.target}
            stage={stage}
            items={items}
            eventId={eventId}
            currentUserId={currentUserId}
            isFullAccess={isFullAccess}
            onChanged={onChanged}
          />
        ))}
      </div>
    </section>
  );
}

function BulkStageGroup({
  stage,
  items,
  eventId,
  currentUserId,
  isFullAccess,
  onChanged,
}: {
  stage: { target: "loading_in" | "loading_out" | "finish"; predecessor: ChecklistPhase; label: string };
  items: EventChecklistItem[];
  eventId: string;
  currentUserId: string | null;
  isFullAccess: boolean;
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const predecessorIdx = CHECKLIST_PHASES.indexOf(stage.predecessor);

  const eligibleIds = useMemo(
    () =>
      items
        .filter((i) => i.currentPhase === stage.predecessor && canActOnItem(i, currentUserId, isFullAccess))
        .map((i) => i.id),
    [items, stage.predecessor, currentUserId, isFullAccess]
  );
  const eligibleKey = eligibleIds.join(",");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(eligibleIds));
  const [lastKey, setLastKey] = useState(eligibleKey);
  if (eligibleKey !== lastKey) {
    setLastKey(eligibleKey);
    setSelected(new Set(eligibleIds));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirmBulk() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    startTransition(async () => {
      const result = await bulkAdvanceChecklistPhase(eventId, ids, stage.target);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast(
        `${result.advanced} item ditandai ${CHECKLIST_PHASE_LABELS[stage.target]}` +
          (result.skipped > 0 ? `, ${result.skipped} dilewati.` : ".")
      );
      onChanged();
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{stage.label}</p>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{eligibleIds.length} siap ditandai</span>
      </div>
      <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-zinc-100 p-2 dark:border-white/10">
        {items.map((item) => {
          const itemIdx = CHECKLIST_PHASES.indexOf(item.currentPhase);
          const isEligible = item.currentPhase === stage.predecessor;
          const canAct = canActOnItem(item, currentUserId, isFullAccess);
          const alreadyPast = itemIdx > predecessorIdx;
          return (
            <label
              key={item.id}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1 text-xs",
                !(isEligible && canAct) && "opacity-60"
              )}
            >
              <input
                type="checkbox"
                disabled={!isEligible || !canAct || pending}
                checked={selected.has(item.id)}
                onChange={() => toggle(item.id)}
              />
              <span className="flex-1 truncate text-zinc-600 dark:text-zinc-300">{item.itemName}</span>
              {alreadyPast ? (
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">sudah</span>
              ) : !isEligible ? (
                <span className="text-[10px] text-zinc-400">belum sampai</span>
              ) : !canAct ? (
                <span className="text-[10px] text-zinc-400">PIC: {item.picName ?? "-"}</span>
              ) : null}
            </label>
          );
        })}
      </div>
      <button
        type="button"
        onClick={confirmBulk}
        disabled={pending || selected.size === 0}
        className={cn(BTN_PRIMARY, "mt-2")}
      >
        Tandai {selected.size} item {CHECKLIST_PHASE_LABELS[stage.target]}
      </button>
    </div>
  );
}

/**
 * "Papan Tracking" (Tahap D, redesain besar Tahap 51) -- halaman TERBUKA
 * untuk 3 divisi operasional + akses penuh, alur 8 fase Design->Mockup->
 * Sample->Production->Completed->Loading In->Loading Out->Finish (lihat
 * types.ts `ChecklistPhase`). PIC item self-approve tiap fase (keputusan
 * Owner: "PIC yang bertanggung jawab"), akses penuh selalu boleh override.
 * SENGAJA tidak ada fitur tambah/hapus item atau kelola kaitan di sini --
 * itu tetap milik halaman detail Admin (`/dashboard/admin/events/[id]`,
 * Tahap C). State di-refresh lewat `router.refresh()` (bukan optimistic
 * update manual) karena struktur phase reviews sudah cukup bercabang.
 */
export function EventTrackingBoard({
  event,
  initialChecklistItems,
  links,
  picOptions,
  currentUserId,
  isFullAccess,
}: {
  event: EventSummary;
  initialChecklistItems: EventChecklistItem[];
  links: EventLink[];
  picOptions: PicOption[];
  currentUserId: string | null;
  isFullAccess: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const items = initialChecklistItems;
  const [savingId, setSavingId] = useState<string | null>(null);
  const [historyTarget, setHistoryTarget] = useState<EventChecklistItem | null>(null);
  const [discussionTarget, setDiscussionTarget] = useState<EventChecklistItem | null>(null);
  // Owner: checklist per kategori dibuat "laci" (dropdown/accordion) --
  // dengan puluhan item per event, tampilan flat lama jadi berantakan.
  // Default semua tertutup, staf buka kategori yang relevan saja.
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set());

  function handleChanged() {
    router.refresh();
  }

  function toggleCategory(category: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  const groupedItems = useMemo(() => {
    const map = new Map<string, EventChecklistItem[]>();
    for (const item of [...items].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const bucket = map.get(item.category) ?? [];
      bucket.push(item);
      map.set(item.category, bucket);
    }
    return Array.from(map.entries()).map(([category, list]) => ({
      category,
      list,
      done: list.filter((i) => i.currentPhase === "finish").length,
    }));
  }, [items]);

  // Pencarian (Owner: "tambahkan fungsi search agar mudah mencari suatu
  // barang") -- saat aktif, kategori yang punya hasil otomatis terbuka
  // (override state manual expandedCategories) dan cuma item yang cocok
  // yang dirender; kategori tanpa hasil disembunyikan seluruhnya.
  const searchQuery = search.trim().toLowerCase();
  const isSearching = searchQuery.length > 0;
  const visibleGroups = useMemo(() => {
    const withFiltered = groupedItems.map((g) => ({
      ...g,
      filteredList: isSearching
        ? g.list.filter((item) => {
            const haystack = `${item.itemName} ${item.detail ?? ""} ${item.qtyInfo ?? ""} ${item.notes ?? ""}`.toLowerCase();
            return haystack.includes(searchQuery);
          })
        : g.list,
    }));
    return isSearching ? withFiltered.filter((g) => g.filteredList.length > 0) : withFiltered;
  }, [groupedItems, isSearching, searchQuery]);

  const progressPct = useMemo(() => {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, item) => acc + computeChecklistItemProgress(item, item.phaseReviews ?? []), 0);
    return Math.round(sum / items.length);
  }, [items]);

  const finishedCount = items.filter((i) => i.currentPhase === "finish").length;

  async function handlePicChange(item: EventChecklistItem, picId: string | null) {
    setSavingId(item.id);
    const result = await updateEventChecklistProgress(item.id, item.eventId, { status: item.status, picId });
    setSavingId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast("PIC disimpan.");
    router.refresh();
  }

  async function handleNeedsProductionToggle(item: EventChecklistItem, needsProduction: boolean) {
    setSavingId(item.id);
    const result = await setChecklistNeedsProduction(item.id, item.eventId, needsProduction);
    setSavingId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast("Perlu Produksi diperbarui.");
    router.refresh();
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
              {finishedCount}/{items.length} item selesai
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Checklist</h2>
            <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
              Isi tiap fase sesuai progres pekerjaan divisimu -- foto konfirmasi wajib sebelum fase berikutnya terbuka.
            </p>
          </div>
          {groupedItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari item..."
                  className={cn(INPUT_XS, "w-40 pl-8 sm:w-52")}
                />
              </div>
              <button
                type="button"
                onClick={() => setExpandedCategories(new Set(groupedItems.map((g) => g.category)))}
                className={BTN}
              >
                Buka Semua
              </button>
              <button type="button" onClick={() => setExpandedCategories(new Set())} className={BTN}>
                Tutup Semua
              </button>
            </div>
          )}
        </div>

        {groupedItems.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Checklist masih kosong"
            description="Admin belum mengisi checklist untuk event ini."
          />
        ) : visibleGroups.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Tidak ditemukan"
            description={`Tidak ada item yang cocok dengan "${search}".`}
          />
        ) : (
          <div className="mt-4 space-y-3">
            {visibleGroups.map(({ category, list, filteredList, done }) => {
              const isOpen = isSearching || expandedCategories.has(category);
              const renderList = isSearching ? filteredList : list;
              return (
                <div key={category} className="rounded-xl border border-zinc-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    disabled={isSearching}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left disabled:cursor-default"
                  >
                    <span className="flex items-center gap-2">
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform",
                          !isOpen && "-rotate-90"
                        )}
                      />
                      <span className="text-xs font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                        {category}
                      </span>
                    </span>
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
                  </button>
                  {isOpen && (
                    <div className="space-y-2 px-3 pb-3">
                      {renderList.map((item) => {
                    const canAct = canActOnItem(item, currentUserId, isFullAccess);
                    const activeReview = CHECKLIST_REVIEW_PHASES.includes(item.currentPhase as ChecklistReviewPhase)
                      ? item.phaseReviews?.find((r) => r.phase === item.currentPhase)
                      : undefined;
                    return (
                      <div key={item.id} className={cn("rounded-2xl border p-3.5", GLASS_SURFACE, GLASS_BORDER)}>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
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
                            <div className="mt-2">
                              <PhaseStepper item={item} />
                            </div>

                            {CHECKLIST_REVIEW_PHASES.includes(item.currentPhase as ChecklistReviewPhase) && (
                              <ReviewPhaseCard
                                item={item}
                                phase={item.currentPhase as ChecklistReviewPhase}
                                review={activeReview}
                                canAct={canAct}
                                eventId={item.eventId}
                                onChanged={handleChanged}
                              />
                            )}
                            {item.currentPhase === "production" && (
                              <ProductionCard item={item} eventId={item.eventId} canAct={canAct} onChanged={handleChanged} />
                            )}
                            {item.currentPhase === "completed" && (
                              <CompletedCard item={item} eventId={item.eventId} canAct={canAct} onChanged={handleChanged} />
                            )}
                            {(item.currentPhase === "loading_in" || item.currentPhase === "loading_out") && (
                              <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                                Lanjut di bagian &quot;Loading &amp; Finish&quot; di bawah.
                              </p>
                            )}
                            {item.currentPhase === "finish" && (
                              <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">Selesai.</p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {isFullAccess && (
                              <label className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                                Produksi:
                                <select
                                  value={item.needsProduction ? "ya" : "tidak"}
                                  disabled={savingId === item.id}
                                  onChange={(e) => handleNeedsProductionToggle(item, e.target.value === "ya")}
                                  className={cn(INPUT_XS, "text-[11px]")}
                                >
                                  <option value="ya">Ya</option>
                                  <option value="tidak">Tidak</option>
                                </select>
                              </label>
                            )}
                            <select
                              value={item.pic ?? ""}
                              disabled={savingId === item.id}
                              onChange={(e) => handlePicChange(item, e.target.value || null)}
                              className={cn(INPUT_XS, "max-w-[9.5rem]")}
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
                    );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {items.length > 0 && (
        <BulkLoadingSection
          items={items}
          eventId={event.id}
          currentUserId={currentUserId}
          isFullAccess={isFullAccess}
          onChanged={handleChanged}
        />
      )}

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
