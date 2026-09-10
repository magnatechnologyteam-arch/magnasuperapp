import { Hammer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  rowToClient,
  rowToContentPost,
  rowToProject,
  type ClientRow,
  type ContentPostRow,
  type ProjectRow,
} from "@/lib/magnative/mappers";
import { InvestorSectionHeader } from "@/components/investor/InvestorSectionHeader";
import { InvestorProjectTable } from "@/components/investor/InvestorProjectTable";
import { InvestorContentTable } from "@/components/investor/InvestorContentTable";

/**
 * Rincian Magnativ untuk investor — proyek (EO/Creative Agency) DAN jadwal
 * konten, bukan cuma dua angka ringkasan. Read only lewat policy SELECT
 * investor (migrasi 0019).
 */
export default async function InvestorMagnativPage() {
  const supabase = await createClient();
  const [projectsRes, contentRes, clientsRes] = await Promise.all([
    supabase.from("magnative_projects").select("*").order("tanggal_mulai", { ascending: false }).returns<ProjectRow[]>(),
    supabase
      .from("magnative_content_posts")
      .select("*")
      .order("tanggal_posting", { ascending: false })
      .returns<ContentPostRow[]>(),
    supabase.from("magnative_clients").select("*").returns<ClientRow[]>(),
  ]);

  const clients = (clientsRes.data ?? []).map(rowToClient);
  const clientName = (clientId?: string) => clients.find((c) => c.id === clientId)?.name ?? "—";

  const projects = (projectsRes.data ?? []).map(rowToProject);
  const projectRows = projects.map((project) => ({ project, clientName: clientName(project.clientId) }));

  const posts = (contentRes.data ?? []).map(rowToContentPost);
  const contentRows = posts.map((post) => ({ post, clientName: clientName(post.clientId) }));

  return (
    <div>
      <InvestorSectionHeader
        icon={Hammer}
        eyebrow="Investor"
        title="Magnativ — Proyek & Konten"
        description={`${projects.length} proyek, ${posts.length} jadwal konten tercatat.`}
        accent="#8B5CF6"
      />

      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Proyek</p>
      <div className="mb-8">
        <InvestorProjectTable rows={projectRows} />
      </div>

      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        Jadwal Konten
      </p>
      <InvestorContentTable rows={contentRows} />
    </div>
  );
}
