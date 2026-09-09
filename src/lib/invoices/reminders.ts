import { formatRupiah } from "@/lib/shared/utils";
import type { Invoice } from "./types";

export type ReminderKind = "h3" | "h1" | "h0" | "overdue";

export type DueReminder = {
  invoice: Invoice;
  daysUntilDue: number;
  kind: ReminderKind;
};

/** Invoice yang sudah lewat jatuh tempo diingatkan lagi tiap kelipatan sekian hari, supaya tidak spam tiap hari tapi tetap ditagih berkala. */
const OVERDUE_REPEAT_EVERY_DAYS = 3;

function diffInDays(dueDateISO: string, todayISODate: string): number {
  const due = new Date(`${dueDateISO}T00:00:00Z`);
  const today = new Date(`${todayISODate}T00:00:00Z`);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Tentukan invoice mana yang perlu diingatkan HARI INI, berdasarkan selisih
 * antara tanggal jatuh tempo dan hari ini (`today`, default hari ini di
 * server — dibuat bisa di-override lewat parameter supaya gampang ditulis
 * unit test-nya tanpa bergantung jam sistem).
 *
 * Sengaja dirancang idempotent kalau endpoint ini dipanggil cuma SEKALI per
 * hari (lihat jadwal di `vercel.json`) — tidak perlu kolom "sudah
 * diingatkan" di database sama sekali:
 * - H-3, H-1, dan H-0 masing-masing cuma cocok pada satu hari kalender yang
 *   spesifik (selisihnya berkurang tepat 1 tiap hari cron jalan), jadi
 *   otomatis kena persis sekali per invoice per threshold.
 * - Yang sudah lewat jatuh tempo diingatkan lagi tiap kelipatan
 *   `OVERDUE_REPEAT_EVERY_DAYS` hari (H+3, H+6, dst) — bukan tiap hari,
 *   supaya tidak membanjiri notifikasi tim finance untuk invoice yang sama.
 *
 * Invoice berstatus "Lunas" atau yang belum diisi `dueDate`-nya sengaja
 * dilewati sepenuhnya — tidak ada yang perlu ditagih dari keduanya.
 */
export function computeDueReminders(invoices: Invoice[], today: string = todayISODate()): DueReminder[] {
  const reminders: DueReminder[] = [];

  for (const invoice of invoices) {
    if (invoice.status === "Lunas" || !invoice.dueDate) continue;

    const daysUntilDue = diffInDays(invoice.dueDate, today);

    if (daysUntilDue === 3) {
      reminders.push({ invoice, daysUntilDue, kind: "h3" });
    } else if (daysUntilDue === 1) {
      reminders.push({ invoice, daysUntilDue, kind: "h1" });
    } else if (daysUntilDue === 0) {
      reminders.push({ invoice, daysUntilDue, kind: "h0" });
    } else if (daysUntilDue < 0 && Math.abs(daysUntilDue) % OVERDUE_REPEAT_EVERY_DAYS === 0) {
      reminders.push({ invoice, daysUntilDue, kind: "overdue" });
    }
  }

  return reminders;
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function reminderTitle(kind: ReminderKind): string {
  switch (kind) {
    case "h3":
      return "Invoice Jatuh Tempo 3 Hari Lagi";
    case "h1":
      return "Invoice Jatuh Tempo Besok";
    case "h0":
      return "Invoice Jatuh Tempo Hari Ini";
    case "overdue":
      return "Invoice Terlambat Dibayar";
  }
}

export function reminderBody(reminder: DueReminder): string {
  const { invoice, daysUntilDue, kind } = reminder;
  const amount = formatRupiah(invoice.total);
  const dasar = `${invoice.invoiceNumber} — ${invoice.clientName} (${amount})`;
  if (kind === "overdue") {
    return `${dasar}, sudah terlambat ${Math.abs(daysUntilDue)} hari dari jatuh tempo.`;
  }
  return dasar;
}
