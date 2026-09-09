import { Receipt } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateID, formatRupiah } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";
import type { Invoice, InvoiceDivision } from "@/lib/invoices/types";
import { INVOICE_STATUS_STYLES as STATUS_STYLES } from "@/lib/status-styles";

const DIVISION_LABELS: Record<InvoiceDivision, string> = {
  magnarent: "Magnarent",
  magnative: "Magnativ",
  production: "Production",
};

/** Tabel invoice lintas divisi, versi read only untuk investor. */
export function InvestorInvoiceTable({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
              <th className="px-5 py-3">No. Invoice</th>
              <th className="px-5 py-3">Klien</th>
              <th className="px-5 py-3">Divisi</th>
              <th className="px-5 py-3">Terbit</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState icon={Receipt} title="Belum ada invoice" description="Belum ada data yang tercatat." />
                </td>
              </tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{inv.invoiceNumber}</td>
                <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{inv.clientName}</td>
                <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{DIVISION_LABELS[inv.division]}</td>
                <td className="px-5 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                  {formatDateID(inv.issuedDate)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums font-semibold text-zinc-900 dark:text-white">
                  {formatRupiah(inv.total)}
                </td>
                <td className="px-5 py-3">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLES[inv.status])}>
                    {inv.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
