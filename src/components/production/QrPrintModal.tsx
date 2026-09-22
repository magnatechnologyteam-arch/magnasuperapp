"use client";

import { Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Modal } from "@/components/ui/Modal";

/**
 * Label QR cetak untuk Alat & Perkakas / Material (Tahap 44 — gap #3
 * analisis-gap-production.md) — pola sama persis dengan
 * `InventoryUnitsModal` di Magnarent (QRCodeSVG + tombol cetak
 * `window.print()`), tapi generik dipakai ulang di dua tempat (Alat &
 * Material) lewat props, bukan ditulis dobel. Value QR = id baris supaya
 * siap dipakai fitur scan-lookup di masa depan.
 */
export function QrPrintModal({
  open,
  onClose,
  value,
  title,
  subtitle,
}: {
  open: boolean;
  onClose: () => void;
  value: string;
  title: string;
  subtitle?: string;
}) {
  function handlePrint() {
    window.print();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Label QR — ${title}`}>
      <div className="flex flex-col items-center gap-4 py-4 print:py-0">
        <QRCodeSVG value={value} size={200} />
        <div className="text-center">
          <p className="text-lg font-bold text-zinc-900 dark:text-white">{title}</p>
          {subtitle && <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white print:hidden"
        >
          <Printer className="h-4 w-4" />
          Cetak Label
        </button>
      </div>
    </Modal>
  );
}
