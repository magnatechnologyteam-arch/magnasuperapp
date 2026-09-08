import type { ReactNode } from "react";
import { SubNav } from "@/components/layout/SubNav";
import { MODULES } from "@/lib/navigation";
import { MagnativeDataProvider } from "@/components/magnative/MagnativeDataProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { createClient } from "@/lib/supabase/server";
import {
  rowToClient,
  rowToContentPost,
  rowToProject,
  type ClientRow,
  type ContentPostRow,
  type ProjectRow,
} from "@/lib/magnative/mappers";

const mod = MODULES.find((m) => m.id === "magnative")!;

/**
 * Layout modul Magnative — Server Component ini mengambil data klien,
 * proyek, dan konten dari Supabase (bukan lagi mock data statis) dan
 * meneruskannya sebagai props ke `MagnativeDataProvider`. Pola persis sama
 * dengan `src/app/dashboard/magnarent/layout.tsx`: begitu ada mutasi lewat
 * Server Action di `src/lib/magnative/actions.ts`, `revalidatePath`
 * membuat layout ini dijalankan ulang otomatis dengan data terbaru.
 */
export default async function MagnativeLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const [clientsResult, projectsResult, postsResult] = await Promise.all([
    supabase.from("magnative_clients").select("*").order("created_at", { ascending: true }).returns<ClientRow[]>(),
    supabase
      .from("magnative_projects")
      .select("*")
      .order("tanggal_mulai", { ascending: false })
      .returns<ProjectRow[]>(),
    supabase
      .from("magnative_content_posts")
      .select("*")
      .order("tanggal_posting", { ascending: true })
      .returns<ContentPostRow[]>(),
  ]);

  if (clientsResult.error) console.error("[magnative] Gagal memuat klien:", clientsResult.error.message);
  if (projectsResult.error) console.error("[magnative] Gagal memuat proyek:", projectsResult.error.message);
  if (postsResult.error) console.error("[magnative] Gagal memuat konten:", postsResult.error.message);

  const clients = (clientsResult.data ?? []).map(rowToClient);
  const projects = (projectsResult.data ?? []).map(rowToProject);
  const contentPosts = (postsResult.data ?? []).map(rowToContentPost);

  return (
    <ToastProvider>
      <MagnativeDataProvider clients={clients} projects={projects} contentPosts={contentPosts}>
        <div>
          <SubNav items={mod.subnav} gradient={mod.gradient} />
          <div className="p-4 md:p-8">{children}</div>
        </div>
      </MagnativeDataProvider>
    </ToastProvider>
  );
}
