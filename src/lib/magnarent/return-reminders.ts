import { todayISO } from "@/lib/shared/utils";
import type { Booking } from "./types";

export type ReturnReminderKind = "h1" | "overdue";
export type ReturnReminder = { booking: Booking; daysUntilReturn: number; kind: ReturnReminderKind };

const OVERDUE_REPEAT_EVERY_DAYS = 3;

function diffInDays(dateISO: string, todayISODate: string): number {
  const target = new Date(`${dateISO}T00:00:00Z`);
  const today = new Date(`${todayISODate}T00:00:00Z`);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Pengingat H-1 sebelum tanggal pengembalian alat (Tahap 28a) — pola
 * idempotent-nya SAMA PERSIS dengan `computeDueReminders` di
 * src/lib/invoices/reminders.ts (lihat komentar di sana untuk penjelasan
 * lengkap kenapa tidak perlu kolom "sudah diingatkan"): H-1 cuma cocok
 * tepat 1 hari kalender, dan yang sudah lewat tanggal kembali tapi belum
 * ditandai "Selesai"/"Dibatalkan" diingatkan lagi tiap
 * `OVERDUE_REPEAT_EVERY_DAYS` hari supaya tidak spam tapi tetap ditagih.
 *
 * Cuma booking berstatus "Menunggu"/"Dikonfirmasi" yang relevan — yang
 * sudah "Selesai" berarti alatnya memang sudah kembali, dan "Dibatalkan"
 * tidak pernah jadi dipakai sama sekali.
 */
export function computeReturnReminders(bookings: Booking[], today: string = todayISO()): ReturnReminder[] {
  const reminders: ReturnReminder[] = [];

  for (const booking of bookings) {
    if (booking.status !== "Menunggu" && booking.status !== "Dikonfirmasi") continue;

    const daysUntilReturn = diffInDays(booking.tanggalSelesai, today);

    if (daysUntilReturn === 1) {
      reminders.push({ booking, daysUntilReturn, kind: "h1" });
    } else if (daysUntilReturn < 0 && Math.abs(daysUntilReturn) % OVERDUE_REPEAT_EVERY_DAYS === 0) {
      reminders.push({ booking, daysUntilReturn, kind: "overdue" });
    }
  }

  return reminders;
}

export function returnReminderTitle(kind: ReturnReminderKind): string {
  return kind === "h1" ? "Alat Harus Kembali Besok" : "Alat Belum Dikembalikan";
}

export function returnReminderBody(reminder: ReturnReminder, itemName: string): string {
  const { booking, daysUntilReturn, kind } = reminder;
  const dasar = `${booking.namaKlien} — ${itemName} (${booking.jumlahUnit} unit)`;
  if (kind === "overdue") {
    return `${dasar}, sudah terlambat ${Math.abs(daysUntilReturn)} hari dari tanggal kembali.`;
  }
  return dasar;
}
