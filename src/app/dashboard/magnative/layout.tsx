import type { ReactNode } from "react";
import { SubNav } from "@/components/layout/SubNav";
import { MODULES } from "@/lib/navigation";
import { MagnativeDataProvider } from "@/components/magnative/MagnativeDataProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { createClient } from "@/lib/supabase/server";
import { getAssignablePics } from "@/lib/events/data";
import {
  rowToClient,
  rowToContentPost,
  rowToProject,
  rowToProjectCostFromExpense,
  rowToProjectTask,
  rowToProjectVendor,
  rowToVendor,
  type ClientRow,
  type ContentPostRow,
  type ProjectRow,
  type MagnativeProjectCostExpenseRow,
  type ProjectTaskRow,
  type ProjectVendorRow,
  type VendorRow,
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
  const [clientsResult, projectsResult, postsResult, costsResult, vendorsResult, projectVendorsResult, tasksResult, picOptions] =
    await Promise.all([
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
      // Tahap C modul "Realisasi Event" (migrasi 0050): biaya proyek sekarang
      // dibaca dari tabel terpadu `event_expenses`, bukan lagi
      // `magnative_project_costs` — lihat komentar di src/lib/magnative/actions.ts.
      supabase
        .from("event_expenses")
        .select("id, source_id, category, notes, amount, expense_date, payment_method")
        .eq("source_type", "magnative_project")
        .order("expense_date", { ascending: false })
        .returns<MagnativeProjectCostExpenseRow[]>(),
      // Update Opsional 2 (gap analysis vs aplikasi luar, 22 Sep 2026):
      // vendor, kaitan vendor-proyek, dan task per proyek — migrasi 0060.
      supabase.from("magnative_vendors").select("*").order("name", { ascending: true }).returns<VendorRow[]>(),
      supabase.from("magnative_project_vendors").select("*").returns<ProjectVendorRow[]>(),
      supabase
        .from("magnative_project_tasks")
        .select("*")
        .order("sort_order", { ascending: true })
        .returns<ProjectTaskRow[]>(),
      // Dipakai ulang dari Papan Tracking (Tahap D) -- RLS `profiles` sudah
      // dibuka lintas 3 divisi operasional + akses penuh khusus untuk
      // penunjukan PIC, lihat migrasi `event_tracking_board_pic_visibility`.
      getAssignablePics(),
    ]);

  if (clientsResult.error) console.error("[magnative] Gagal memuat klien:", clientsResult.error.message);
  if (projectsResult.error) console.error("[magnative] Gagal memuat proyek:", projectsResult.error.message);
  if (postsResult.error) console.error("[magnative] Gagal memuat konten:", postsResult.error.message);
  if (costsResult.error) console.error("[magnative] Gagal memuat biaya proyek:", costsResult.error.message);
  if (vendorsResult.error) console.error("[magnative] Gagal memuat vendor:", vendorsResult.error.message);
  if (projectVendorsResult.error) console.error("[magnative] Gagal memuat kaitan vendor:", projectVendorsResult.error.message);
  if (tasksResult.error) console.error("[magnative] Gagal memuat task proyek:", tasksResult.error.message);

  const clients = (clientsResult.data ?? []).map(rowToClient);
  const projects = (projectsResult.data ?? []).map(rowToProject);
  const contentPosts = (postsResult.data ?? []).map(rowToContentPost);
  const projectCosts = (costsResult.data ?? []).map(rowToProjectCostFromExpense);
  const vendors = (vendorsResult.data ?? []).map(rowToVendor);
  const projectVendors = (projectVendorsResult.data ?? []).map(rowToProjectVendor);
  const picNameMap = new Map(picOptions.map((p) => [p.id, p.fullName]));
  const projectTasks = (tasksResult.data ?? []).map((row) => rowToProjectTask(row, picNameMap));

  return (
    <ToastProvider>
      <MagnativeDataProvider
        clients={clients}
        projects={projects}
        contentPosts={contentPosts}
        projectCosts={projectCosts}
        vendors={vendors}
        projectVendors={projectVendors}
        projectTasks={projectTasks}
        picOptions={picOptions}
      >
        <div>
          <SubNav items={mod.subnav} gradient={mod.gradient} />
          <div className="p-4 md:p-8">{children}</div>
        </div>
      </MagnativeDataProvider>
    </ToastProvider>
  );
}
