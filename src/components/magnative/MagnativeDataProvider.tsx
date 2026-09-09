"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import type { Client, ContentPost, Project, ProjectCost } from "@/lib/magnative/types";
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
  deleteProjectCost: (id: string) => Promise<MutationResult>;
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
  children,
}: {
  clients: Client[];
  projects: Project[];
  contentPosts: ContentPost[];
  projectCosts: ProjectCost[];
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
  const deleteProjectCost = useCallback((id: string) => actions.deleteProjectCost(id), []);

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

  const value = useMemo<MagnativeDataContextValue>(
    () => ({
      clients,
      projects,
      contentPosts,
      projectCosts,
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
      deleteProjectCost,
    }),
    [
      clients,
      projects,
      contentPosts,
      projectCosts,
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
      deleteProjectCost,
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
