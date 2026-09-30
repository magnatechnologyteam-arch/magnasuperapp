"use client";

import { useState } from "react";
import { CalendarClock, ClipboardList } from "lucide-react";
import { cn } from "@/lib/cn";
import { EventList } from "./EventList";
import { EventTypeManager } from "./EventTypeManager";
import type { EventSummary, EventType, EventTypeTemplateItem } from "@/lib/events/types";

/**
 * Tahap G: gabungan halaman Admin "Event" + "Jenis Event" jadi satu (Owner:
 * "untuk event den jenis event, alangkah baiknya disatukan saja") -- dua
 * tab dalam satu halaman, bukan dua halaman terpisah lagi. Data KEDUANYA
 * dimuat sekaligus dari Server Component (lihat page.tsx) supaya pindah
 * tab instan tanpa refetch, sama seperti pola EventTypeManager memuat
 * semua template lintas jenis sekaligus.
 */
export function EventAdminTabs({
  events,
  eventTypes,
  templateItems,
}: {
  events: EventSummary[];
  eventTypes: EventType[];
  templateItems: EventTypeTemplateItem[];
}) {
  const [tab, setTab] = useState<"events" | "types">("events");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-zinc-200 dark:border-white/10">
        <button
          type="button"
          onClick={() => setTab("events")}
          className={cn(
            "flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors",
            tab === "events"
              ? "border-violet-600 text-violet-700 dark:border-violet-400 dark:text-violet-300"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          )}
        >
          <CalendarClock className="h-4 w-4" />
          Event
        </button>
        <button
          type="button"
          onClick={() => setTab("types")}
          className={cn(
            "flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors",
            tab === "types"
              ? "border-violet-600 text-violet-700 dark:border-violet-400 dark:text-violet-300"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          )}
        >
          <ClipboardList className="h-4 w-4" />
          Jenis Event
        </button>
      </div>

      {tab === "events" ? (
        <EventList events={events} eventTypes={eventTypes} />
      ) : (
        <EventTypeManager initialEventTypes={eventTypes} initialTemplateItems={templateItems} />
      )}
    </div>
  );
}
