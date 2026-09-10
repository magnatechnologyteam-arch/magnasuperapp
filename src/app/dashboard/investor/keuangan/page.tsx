import { Wallet2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { rowToInvoice, type InvoiceRow } from "@/lib/invoices/mappers";
import { formatRupiah } from "@/lib/shared/utils";
import { InvestorSectionHeader } from "@/components/investor/InvestorSectionHeader";
import { InvestorInvoiceTable } from "@/components/investor/InvestorInvoiceTable";

/**
 * Rincian Keuangan untuk investor — daftar invoice lintas divisi (bukan
 * cuma dua angka "Pendapatan Lunas"/"Piutang Berjalan" di Ringkasan). Read
 * only lewat policy SELECT investor (migrasi 0019).
 */
export default async function InvestorKeuanganPage() {
  const supabase = await createClient();
  const invoicesRes = await supabase
    .from("invoices")
    .select("*")
    .order("issued_date", { ascending: false })
    .returns<InvoiceRow[]>();

  const invoices = (invoicesRes.data ?? []).map(rowToInvoice);
  const totalLunas = invoices.filter((i) => i.status === "Lunas").reduce((sum, i) => sum + i.total, 0);
  const totalPiutang = invoices.filter((i) => i.status !== "Lunas").reduce((sum, i) => sum + i.total, 0);

  return (
    <div>
      <InvestorSectionHeader
        icon={Wallet2}
        eyebrow="Investor"
        title="Keuangan — Invoice"
        description={`Lunas ${formatRupiah(totalLunas)} · Piutang berjalan ${formatRupiah(totalPiutang)}.`}
        accent="#10B981"
      />
      <InvestorInvoiceTable invoices={invoices} />
    </div>
  );
}
