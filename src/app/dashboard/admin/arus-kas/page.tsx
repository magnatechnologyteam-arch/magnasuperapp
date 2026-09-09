import { redirect } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import {
  rowToClient,
  rowToProject,
  rowToProjectCost,
  type ClientRow,
  type ProjectRow,
  type ProjectCostRow,
} from "@/lib/magnative/mappers";
import { rowToInvoice, type InvoiceRow } from "@/lib/invoices/mappers";
import { ArusKasProyekView, type ArusKasEvent, type ProyekArusKas } from "@/components/admin/ArusKasProyekView";

/**
 * Laporan Arus Kas per Proyek Magnativ — jawaban langsung untuk permintaan
 * investor (diteruskan owner): "ada link yg bisa kasih kita rekapan cost
 * dan kapannya (keluar atau masuk dana)". HANYA akses penuh (division
 * "all"), pola sama seperti Laporan/Piutang/Faktur — termasuk kalau akun
 * itu memang dibuatkan khusus untuk investor: migrasi 0003 sudah mendesain
 * "all" mencakup Owner/Finance/Investor sekaligus, jadi tidak perlu peran
 * baru untuk ini, cukup akun "Kelola Pengguna" dengan akses penuh.
 *
 * Dana MASUK dihitung dari invoice yang terhubung ke proyek ini
 * (sourceType "magnative_project") yang berstatus "Lunas" — pakai
 * `issuedDate` sebagai tanggal event, proksi terdekat yang ada untuk
 * "kapan uangnya masuk" (skema invoice belum mencatat tanggal pelunasan
 * terpisah dari tanggal terbit). Invoice yang masih Draft/Terkirim tetap
 * ditampilkan di timeline tapi dihitung sebagai "potensi", bukan dana
 * yang sudah cair — lihat komentar di ArusKasProyekView.tsx.
 *
 * Dana KELUAR dihitung dari `magnative_project_costs` (migrasi 0017),
 * tanggalnya eksplisit lewat `costDate`.
 */
export default async function ArusKasProyekPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.division !== "all") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [projectsRes, clientsRes, costsRes, invoicesRes] = await Promise.all([
    supabase.from("magnative_projects").select("*").returns<ProjectRow[]>(),
    supabase.from("magnative_clients").select("*").returns<ClientRow[]>(),
    supabase.from("magnative_project_costs").select("*").returns<ProjectCostRow[]>(),
    supabase.from("invoices").select("*").eq("source_type", "magnative_project").returns<InvoiceRow[]>(),
  ]);

  const projects = (projectsRes.data ?? []).map(rowToProject);
  const clients = (clientsRes.data ?? []).map(rowToClient);
  const costs = (costsRes.data ?? []).map(rowToProjectCost);
  const invoices = (invoicesRes.data ?? []).map(rowToInvoice);

  const data: ProyekArusKas[] = projects.map((p) => {
    const projectCosts = costs.filter((c) => c.projectId === p.id);
    const projectInvoices = invoices.filter((i) => i.sourceId === p.id);
    const client = clients.find((c) => c.id === p.clientId);

    const totalKeluar = projectCosts.reduce((sum, c) => sum + c.amount, 0);
    const totalMasuk = projectInvoices
      .filter((i) => i.status === "Lunas")
      .reduce((sum, i) => sum + i.total, 0);
    const totalPotensi = projectInvoices
      .filter((i) => i.status !== "Lunas")
      .reduce((sum, i) => sum + i.total, 0);

    const timeline: ArusKasEvent[] = [
      ...projectCosts.map(
        (c): ArusKasEvent => ({
          id: `cost-${c.id}`,
          date: c.costDate,
          type: "keluar",
          description: c.description,
          amount: c.amount,
        })
      ),
      ...projectInvoices.map(
        (i): ArusKasEvent => ({
          id: `invoice-${i.id}`,
          date: i.issuedDate,
          type: "masuk",
          description: `Invoice ${i.invoiceNumber}${i.status !== "Lunas" ? ` (${i.status})` : ""}`,
          amount: i.total,
          realized: i.status === "Lunas",
        })
      ),
    ].sort((a, b) => a.date.localeCompare(b.date));

    return {
      project: p,
      clientName: client?.name ?? "—",
      totalMasuk,
      totalKeluar,
      totalPotensi,
      net: totalMasuk - totalKeluar,
      timeline,
    };
  });

  const grandTotalMasuk = data.reduce((sum, d) => sum + d.totalMasuk, 0);
  const grandTotalKeluar = data.reduce((sum, d) => sum + d.totalKeluar, 0);
  const grandTotalPotensi = data.reduce((sum, d) => sum + d.totalPotensi, 0);

  return (
    <div className="p-4 md:p-8">
      <div className="animate-fade-up flex items-start gap-4">
        <div className="relative shrink-0">
          <span
            className="absolute -inset-1.5 animate-pulse rounded-2xl bg-gradient-to-br from-violet-500 to-emerald-500 opacity-30 blur-lg"
            aria-hidden
          />
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-emerald-500 text-white shadow-sm">
            <ArrowLeftRight className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-500 dark:text-violet-400">
            Admin
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Arus Kas per Proyek — Magnativ
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Rekap biaya keluar &amp; dana masuk tiap proyek, termasuk yang masih tahap Pitching.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <ArusKasProyekView
          data={data}
          grandTotalMasuk={grandTotalMasuk}
          grandTotalKeluar={grandTotalKeluar}
          grandTotalPotensi={grandTotalPotensi}
        />
      </div>
    </div>
  );
}
