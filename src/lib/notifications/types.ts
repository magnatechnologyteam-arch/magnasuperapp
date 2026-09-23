/**
 * Satu notifikasi in-app (migrasi 0055) — ditulis dari funnel terpusat
 * `notifyDivision`/`notifyUsers` (src/lib/push/notify.ts). `isRead` bukan
 * kolom asli di tabel `notifications` (satu baris ditujukan ke banyak
 * staf sekaligus, jadi "sudah dibaca" itu PER PENGGUNA) — dihitung di
 * `listMyNotifications` dari tabel terpisah `notification_reads`.
 */
export type AppNotification = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  createdAt: string;
  isRead: boolean;
  /** Flag generik "penting" (migrasi 0062) -- dipakai ImportantNotificationBanner
   * di AppShell untuk menampilkan notifikasi ini sebagai banner mencolok,
   * terpisah dari daftar biasa di NotificationInbox. Saat ini cuma dipakai
   * notifikasi "Event Baru" (lihat createEvent di lib/events/actions.ts). */
  isImportant: boolean;
};
