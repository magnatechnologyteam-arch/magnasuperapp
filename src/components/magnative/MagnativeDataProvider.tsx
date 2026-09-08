"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import type { Client, ContentPost, Project } from "@/lib/magnative/types";
import * as actions from "@/lib/magnative/actions";
import type { MutationResult } from "@/lib/magnative/actions";

const ACTIVE_PROJECT_STATUSES: Project["status"][] = ["Perencanaan", "Berjalan"];

type MagnativeDataContextValue = {
  clients: Client[];
  projects: Project[];
  contentPosts: ContentPost[];

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
  children,
}: {
  clients: Client[];
  projects: Project[];
  contentPosts: ContentPost[];
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

  /** Dipakai UI untuk memblokir hapus klien yang masih punya proyek aktif. */
  const getActiveProjectsForClient = useCallback(
    (clientId: string) =>
      projects.filter((p) => p.clientId === clientId && ACTIVE_PROJECT_STATUSES.includes(p.status)),
    [projects]
  );

  const value = useMemo<MagnativeDataContextValue>(
    () => ({
      clients,
      projects,
      contentPosts,
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
    }),
    [
      clients,
      projects,
      contentPosts,
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
