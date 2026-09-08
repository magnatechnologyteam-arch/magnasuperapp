"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import type { Booking, BookingStatus, InventoryItem, PaymentStatus } from "@/lib/magnarent/types";
import { ACTIVE_BOOKING_STATUSES, getAvailableUnitsInRange } from "@/lib/magnarent/availability";
import * as actions from "@/lib/magnarent/actions";
import type { BookingConflict, MutationResult, SaveBookingResult } from "@/lib/magnarent/actions";

export type NewBookingInput = {
  itemId: string;
  namaKlien: string;
  teleponKlien?: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  jumlahUnit: number;
  statusPembayaran: PaymentStatus;
  catatan?: string;
};

export type { BookingConflict };

type MagnarentDataContextValue = {
  inventory: InventoryItem[];
  bookings: Booking[];
  addInventoryItem: (input: Omit<InventoryItem, "id">) => Promise<MutationResult>;
  updateInventoryItem: (id: string, input: Omit<InventoryItem, "id">) => Promise<MutationResult>;
  deleteInventoryItem: (id: string) => Promise<MutationResult>;
  getActiveBookingsForItem: (itemId: string) => Booking[];
  addBooking: (input: NewBookingInput) => Promise<SaveBookingResult>;
  updateBooking: (id: string, input: NewBookingInput) => Promise<SaveBookingResult>;
  deleteBooking: (id: string) => Promise<MutationResult>;
  updateBookingStatus: (id: string, status: BookingStatus) => Promise<MutationResult>;
  checkAvailability: (itemId: string, start: string, end: string, excludeId?: string) => number;
};

const MagnarentDataContext = createContext<MagnarentDataContextValue | null>(null);

/**
 * Sumber data modul Magnarent (inventaris + booking) — SEKARANG datanya
 * datang dari Supabase, di-fetch di `src/app/dashboard/magnarent/layout.tsx`
 * (Server Component) dan diteruskan ke sini lewat props `inventory`/
 * `bookings`. Provider ini TIDAK lagi menyimpan state duplikat di memori:
 * setiap mutasi memanggil Server Action di `src/lib/magnarent/actions.ts`
 * yang menulis ke Supabase lalu `revalidatePath` — itu otomatis membuat
 * Next.js mengambil ulang data di layout dan mengirim props baru ke sini,
 * jadi semua orang di divisi Magnarent (di perangkat mana pun) melihat data
 * yang sama, bukan cuma tersimpan per-browser seperti sebelumnya.
 */
export function MagnarentDataProvider({
  inventory,
  bookings,
  children,
}: {
  inventory: InventoryItem[];
  bookings: Booking[];
  children: ReactNode;
}) {
  const addInventoryItem = useCallback((input: Omit<InventoryItem, "id">) => actions.addInventoryItem(input), []);
  const updateInventoryItem = useCallback(
    (id: string, input: Omit<InventoryItem, "id">) => actions.updateInventoryItem(id, input),
    []
  );
  const deleteInventoryItem = useCallback((id: string) => actions.deleteInventoryItem(id), []);
  const addBooking = useCallback((input: NewBookingInput) => actions.addBooking(input), []);
  const updateBooking = useCallback((id: string, input: NewBookingInput) => actions.updateBooking(id, input), []);
  const deleteBooking = useCallback((id: string) => actions.deleteBooking(id), []);
  const updateBookingStatus = useCallback(
    (id: string, status: BookingStatus) => actions.updateBookingStatus(id, status),
    []
  );

  /** Dipakai UI untuk memblokir hapus alat yang masih dipegang booking aktif. */
  const getActiveBookingsForItem = useCallback(
    (itemId: string) =>
      bookings.filter((b) => b.itemId === itemId && ACTIVE_BOOKING_STATUSES.includes(b.status)),
    [bookings]
  );

  const checkAvailability = useCallback(
    (itemId: string, start: string, end: string, excludeId?: string) => {
      const item = inventory.find((i) => i.id === itemId);
      if (!item) return 0;
      return getAvailableUnitsInRange(item, bookings, start, end, excludeId);
    },
    [inventory, bookings]
  );

  const value = useMemo<MagnarentDataContextValue>(
    () => ({
      inventory,
      bookings,
      addInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
      getActiveBookingsForItem,
      addBooking,
      updateBooking,
      deleteBooking,
      updateBookingStatus,
      checkAvailability,
    }),
    [
      inventory,
      bookings,
      addInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
      getActiveBookingsForItem,
      addBooking,
      updateBooking,
      deleteBooking,
      updateBookingStatus,
      checkAvailability,
    ]
  );

  return <MagnarentDataContext.Provider value={value}>{children}</MagnarentDataContext.Provider>;
}

export function useMagnarentData(): MagnarentDataContextValue {
  const ctx = useContext(MagnarentDataContext);
  if (!ctx) {
    throw new Error("useMagnarentData harus dipakai di dalam <MagnarentDataProvider>");
  }
  return ctx;
}
