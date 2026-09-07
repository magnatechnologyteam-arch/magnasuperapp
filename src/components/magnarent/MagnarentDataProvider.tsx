"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Booking, BookingStatus, InventoryItem, PaymentStatus } from "@/lib/magnarent/types";
import { INITIAL_BOOKINGS, INITIAL_INVENTORY } from "@/lib/magnarent/mock-data";
import { genId } from "@/lib/magnarent/date";
import {
  ACTIVE_BOOKING_STATUSES,
  getAvailableUnitsInRange,
  getOverlappingBookings,
} from "@/lib/magnarent/availability";

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

export type BookingConflict = {
  overlapping: Booking[];
  available: number;
  requested: number;
};

type SaveBookingResult = { ok: true } | { ok: false; conflict: BookingConflict };

type MagnarentDataContextValue = {
  inventory: InventoryItem[];
  bookings: Booking[];
  addInventoryItem: (input: Omit<InventoryItem, "id">) => void;
  updateInventoryItem: (id: string, input: Omit<InventoryItem, "id">) => void;
  deleteInventoryItem: (id: string) => void;
  getActiveBookingsForItem: (itemId: string) => Booking[];
  addBooking: (input: NewBookingInput) => SaveBookingResult;
  updateBooking: (id: string, input: NewBookingInput) => SaveBookingResult;
  deleteBooking: (id: string) => void;
  updateBookingStatus: (id: string, status: BookingStatus) => void;
  checkAvailability: (itemId: string, start: string, end: string, excludeId?: string) => number;
};

const MagnarentDataContext = createContext<MagnarentDataContextValue | null>(null);

/**
 * Sumber state operasional modul Magnarent (inventaris + booking), dipasang
 * SEKALI di `src/app/dashboard/magnarent/layout.tsx`. Karena Next.js tidak
 * me-remount layout saat berpindah antar sub-rute, provider ini — dan React
 * state di dalamnya — tetap hidup selama pengguna berada di dalam modul:
 * menambah alat di tab Inventaris langsung terlihat di form Booking tanpa
 * reload atau kembali ke Hub. (Untuk MVP ini state hanya di memori — belum
 * tersambung ke Supabase.)
 */
export function MagnarentDataProvider({ children }: { children: ReactNode }) {
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);

  const addInventoryItem = useCallback((input: Omit<InventoryItem, "id">) => {
    setInventory((prev) => [...prev, { ...input, id: genId("inv") }]);
  }, []);

  const updateInventoryItem = useCallback((id: string, input: Omit<InventoryItem, "id">) => {
    setInventory((prev) => prev.map((i) => (i.id === id ? { ...input, id } : i)));
  }, []);

  const deleteInventoryItem = useCallback((id: string) => {
    setInventory((prev) => prev.filter((i) => i.id !== id));
  }, []);

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

  const addBooking = useCallback(
    (input: NewBookingInput): SaveBookingResult => {
      const item = inventory.find((i) => i.id === input.itemId);
      if (!item) {
        return { ok: false, conflict: { overlapping: [], available: 0, requested: input.jumlahUnit } };
      }

      // Inti pencegahan bentrok: jumlah unit yang diminta tidak boleh melebihi
      // sisa unit yang belum "dipegang" booking aktif lain pada rentang yang sama.
      const overlapping = getOverlappingBookings(
        bookings,
        input.itemId,
        input.tanggalMulai,
        input.tanggalSelesai
      );
      const available = getAvailableUnitsInRange(
        item,
        bookings,
        input.tanggalMulai,
        input.tanggalSelesai
      );

      if (input.jumlahUnit > available) {
        return { ok: false, conflict: { overlapping, available, requested: input.jumlahUnit } };
      }

      setBookings((prev) => [...prev, { ...input, id: genId("bk"), status: "Menunggu" }]);
      return { ok: true };
    },
    [inventory, bookings]
  );

  const updateBooking = useCallback(
    (id: string, input: NewBookingInput): SaveBookingResult => {
      const item = inventory.find((i) => i.id === input.itemId);
      if (!item) {
        return { ok: false, conflict: { overlapping: [], available: 0, requested: input.jumlahUnit } };
      }

      // Sama seperti addBooking, tapi booking ini sendiri dikecualikan dari
      // perhitungan (excludeBookingId) supaya tidak "bentrok dengan dirinya sendiri".
      const overlapping = getOverlappingBookings(
        bookings,
        input.itemId,
        input.tanggalMulai,
        input.tanggalSelesai,
        id
      );
      const available = getAvailableUnitsInRange(
        item,
        bookings,
        input.tanggalMulai,
        input.tanggalSelesai,
        id
      );

      if (input.jumlahUnit > available) {
        return { ok: false, conflict: { overlapping, available, requested: input.jumlahUnit } };
      }

      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...input } : b)));
      return { ok: true };
    },
    [inventory, bookings]
  );

  const deleteBooking = useCallback((id: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const updateBookingStatus = useCallback((id: string, status: BookingStatus) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
  }, []);

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
