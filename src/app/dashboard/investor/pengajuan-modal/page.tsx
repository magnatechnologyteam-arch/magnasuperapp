import { createClient } from "@/lib/supabase/server";
import { rowToCapitalRequest, type CapitalRequestRow } from "@/lib/capital-requests/mappers";
import { CapitalRequestInbox } from "@/components/investor/CapitalRequestInbox";

/**
 * Kotak masuk investor — layout.tsx di atas sudah menjaga akses (investor
 * atau akses penuh saja) lewat `requireInvestorAccess()`, jadi halaman ini
 * tinggal fokus ambil data.
 */
export default async function InvestorPengajuanModalPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("capital_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<CapitalRequestRow[]>();

  if (error) console.error("[capital-requests] Gagal memuat kotak masuk investor:", error.message);

  const requests = (data ?? []).map(rowToCapitalRequest);

  return <CapitalRequestInbox requests={requests} />;
}
