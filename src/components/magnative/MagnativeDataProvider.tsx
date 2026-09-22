"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import type { Client, ContentPost, Project, ProjectCost, ProjectTask, ProjectVendor, Vendor } from "@/lib/magnative/types";
import type { PicOption } from "@/lib/events/types";
import * as actions from "@/lib/magnative/actions";
import type { MutationResult } from "@/lib/magnative/actions";

// "Pitching" ikut dihitung aktif sejak migrasi 0016 — konsisten dengan
// guard di `deleteClient` (src/lib/magnative/actions.ts): lead yang masih
// dalam proses pitching juga bukan proyek yang aman diabaikan begitu saja.
const ACTIVE_PROJECT_STATUSES: Project["status"][] = ["Pitching", "Perencanaan", "Berjalan"];

type MagnativeDataContextValue = {
  clients: Client[];
  projects: Project[];
  contentPosts: ContentPost[];
  projectCosts: ProjectCost[];
  vendors: Vendor[];
  projectVendors: ProjectVendor[];
  projectTasks: ProjectTask[];
  picOptions: PicOption[];

  addClient: (input: Omit<Client, "id">) => Promise<MutationResult>;
  updateClient: (id: string, input: Omit<Client, "id">) => Promise<MutationResult>;
  deleteClient: (id: string) => Promise<MutationResult>;
  getActiveProjectsForClient: (clientId: string) => Project[];

  addProject: (input: Omit<Project, "id">) => Promise<MutationResult>;
  updateProject: (id: string, input: Omit<Project, "id">) => Promise<MutationResult>;
  deleteProject: (id: string) => Promise<MutationResult>;

  addContentPost: (input: Omit<ContentPost, "id">) => Promise<MutationResult>;
  updateContentPost: (id: string, input: Omit<ContentPost, "id">) => Promise<MutationResult>;
  deleteContentPost: (id: string) => Promise<MutationResult>;

  getCostsForProject: (projectId: string) => ProjectCost[];
  addProjectCost: (input: Omit<ProjectCost, "id">) => Promise<MutationResult>;
  updateProjectCost: (id: string, input: Omit<ProjectCost, "id">) => Promise<MutationResult>;
  deleteProjectCost: (id: string) => Promise<MutationResult>;

  addVendor: (input: Omit<Vendor, "id">) => Promise<MutationResult>;
  updateVendor: (id: string, input: Omit<Vendor, "id">) => Promise<MutationResult>;
  deleteVendor: (id: string) => Promise<MutationResult>;

  getVendorLinksForProject: (projectId: string) => ProjectVendor[];
  addProjectVendor: (input: Omit<ProjectVendor, "id">) => Promise<MutationResult>;
  updateProjectVendor: (id: string, input: Omit<ProjectVendor, "id">) => Promise<MutationResult>;
  deleteProjectVendor: (id: string) => Promise<MutationResult>;

  getTasksForProject: (projectId: string) => ProjectTask[];
  addProjectTask: (input: Omit<ProjectTask, "id" | "picName">) => Promise<MutationResult>;
  updateProjectTask: (id: string, input: Omit<ProjectTask, "id" | "picName">) => Promise<MutationResult>;
  updateProjectTaskStatus: (id: string, status: ProjectTask["status"]) => Promise<MutationResult>;
  deleteProjectTask: (id: string) => Promise<MutationResult>;
};

const MagnativeDataContext = createContext<MagnativeDataContextValue | null>(null);

/**
 * Sumber data modul Magnative (klien, proyek, konten sosial media) —
 * SEKARANG datanya datang dari Supabase, di-fetch di
 * `src/app/dashboard/magnative/layout.tsx` (Server Component) dan
 * diteruskan lewat props. Pola persis sama dengan `MagnarentDataProvider`:
 * tidak ada state duplikat di sini, setiap mutasi memanggil Server Action
 * di `src/lib/magnative/actions.ts` yang `revalidatePath` setelah menulis
 * ke DB — Next.js otomatis mengambil ulang data di layout dan mengirim
 * props baru ke sini.
 */
export function MagnativeDataProvider({
  clients,
  projects,
  contentPosts,
  projectCosts,
  vendors,
  projectVendors,
  projectTasks,
  picOptions,
  children,
}: {
  clients: Client[];
  projects: Project[];
  contentPosts: ContentPost[];
  projectCosts: ProjectCost[];
  vendors: Vendor[];
  projectVendors: ProjectVendor[];
  projectTasks: ProjectTask[];
  picOptions: PicOption[];
  children: ReactNode;
}) {
  const addClient = useCallback((input: Omit<Client, "id">) => actions.addClient(input), []);
  const updateClient = useCallback((id: string, input: Omit<Client, "id">) => actions.updateClient(id, input), []);
  const deleteClient = useCallback((id: string) => actions.deleteClient(id), []);

  const addProject = useCallback((input: Omit<Project, "id">) => actions.addProject(input), []);
  const updateProject = useCallback(
    (id: string, input: Omit<Project, "id">) => actions.updateProject(id, input),
    []
  );
  const deleteProject = useCallback((id: string) => actions.deleteProject(id), []);

  const addContentPost = useCallback((input: Omit<ContentPost, "id">) => actions.addContentPost(input), []);
  const updateContentPost = useCallback(
    (id: string, input: Omit<ContentPost, "id">) => actions.updateContentPost(id, input),
    []
  );
  const deleteContentPost = useCallback((id: string) => actions.deleteContentPost(id), []);

  const addProjectCost = useCallback((input: Omit<ProjectCost, "id">) => actions.addProjectCost(input), []);
  const updateProjectCost = useCallback(
    (id: string, input: Omit<ProjectCost, "id">) => actions.updateProjectCost(id, input),
    []
  );
  const deleteProjectCost = useCallback((id: string) => actions.deleteProjectCost(id), []);

  const addVendor = useCallback((input: Omit<Vendor, "id">) => actions.addVendor(input), []);
  const updateVendor = useCallback((id: string, input: Omit<Vendor, "id">) => actions.updateVendor(id, input), []);
  const deleteVendor = useCallback((id: string) => actions.deleteVendor(id), []);

  const addProjectVendor = useCallback((input: Omit<ProjectVendor, "id">) => actions.addProjectVendor(input), []);
  const updateProjectVendor = useCallback(
    (id: string, input: Omit<ProjectVendor, "id">) => actions.updateProjectVendor(id, input),
    []
  );
  const deleteProjectVendor = useCallback((id: string) => actions.deleteProjectVendor(id), []);

  const addProjectTask = useCallback(
    (input: Omit<ProjectTask, "id" | "picName">) => actions.addProjectTask(input),
    []
  );
  const updateProjectTask = useCallback(
    (id: string, input: Omit<ProjectTask, "id" | "picName">) => actions.updateProjectTask(id, input),
    []
  );
  const updateProjectTaskStatus = useCallback(
    (id: string, status: ProjectTask["status"]) => actions.updateProjectTaskStatus(id, status),
    []
  );
  const deleteProjectTask = useCallback((id: string) => actions.deleteProjectTask(id), []);

  /** Dipakai UI untuk memblokir hapus klien yang masih punya proyek aktif. */
  const getActiveProjectsForClient = useCallback(
    (clientId: string) =>
      projects.filter((p) => p.clientId === clientId && ACTIVE_PROJECT_STATUSES.includes(p.status)),
    [projects]
  );

  /** Dipakai UI biaya per proyek — diurutkan terbaru dulu. */
  const getCostsForProject = useCallback(
    (projectId: string) =>
      projectCosts.filter((c) => c.projectId === projectId).sort((a, b) => b.costDate.localeCompare(a.costDate)),
    [projectCosts]
  );

  /** Dipakai modal vendor per proyek (Update Opsional 2). */
  const getVendorLinksForProject = useCallback(
    (projectId: string) => projectVendors.filter((v) => v.projectId === projectId),
    [projectVendors]
  );

  /** Dipakai modal task per proyek (Update Opsional 2) — sudah diurutkan `sortOrder` dari query layout. */
  const getTasksForProject = useCallback(
    (projectId: string) => projectTasks.filter((t) => t.projectId === projectId),
    [projectTasks]
  );

  const value = useMemo<MagnativeDataContextValue>(
    () => ({
      clients,
      projects,
      contentPosts,
      projectCosts,
      vendors,
      projectVendors,
      projectTasks,
      picOptions,
      addClient,
      updateClient,
      deleteClient,
      getActiveProjectsForClient,
      addProject,
      updateProject,
      deleteProject,
      addContentPost,
      updateContentPost,
      deleteContentPost,
      getCostsForProject,
      addProjectCost,
      updateProjectCost,
      deleteProjectCost,
      addVendor,
      updateVendor,
      deleteVendor,
      getVendorLinksForProject,
      addProjectVendor,
      updateProjectVendor,
      deleteProjectVendor,
      getTasksForProject,
      addProjectTask,
      updateProjectTask,
      updateProjectTaskStatus,
      deleteProjectTask,
    }),
    [
      clients,
      projects,
      contentPosts,
      projectCosts,
      vendors,
      projectVendors,
      projectTasks,
      picOptions,
      addClient,
      updateClient,
      deleteClient,
      getActiveProjectsForClient,
      addProject,
      updateProject,
      deleteProject,
      addContentPost,
      updateContentPost,
      deleteContentPost,
      getCostsForProject,
      addProjectCost,
      updateProjectCost,
      deleteProjectCost,
      addVendor,
      updateVendor,
      deleteVendor,
      getVendorLinksForProject,
      addProjectVendor,
      updateProjectVendor,
      deleteProjectVendor,
      getTasksForProject,
      addProjectTask,
      updateProjectTask,
      updateProjectTaskStatus,
      deleteProjectTask,
    ]
  );

  return <MagnativeDataContext.Provider value={value}>{children}</MagnativeDataContext.Provider>;
}

export function useMagnativeData(): MagnativeDataContextValue {
  const ctx = useContext(MagnativeDataContext);
  if (!ctx) {
    throw new Error("useMagnativeData harus dipakai di dalam <MagnativeDataProvider>");
  }
  return ctx;
}
