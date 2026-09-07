"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Client, ContentPost, Project } from "@/lib/magnative/types";
import { INITIAL_CLIENTS, INITIAL_CONTENT_POSTS, INITIAL_PROJECTS } from "@/lib/magnative/mock-data";
import { genId } from "@/lib/shared/utils";

const ACTIVE_PROJECT_STATUSES: Project["status"][] = ["Perencanaan", "Berjalan"];

type MagnativeDataContextValue = {
  clients: Client[];
  projects: Project[];
  contentPosts: ContentPost[];

  addClient: (input: Omit<Client, "id">) => void;
  updateClient: (id: string, input: Omit<Client, "id">) => void;
  deleteClient: (id: string) => void;
  getActiveProjectsForClient: (clientId: string) => Project[];

  addProject: (input: Omit<Project, "id">) => void;
  updateProject: (id: string, input: Omit<Project, "id">) => void;
  deleteProject: (id: string) => void;

  addContentPost: (input: Omit<ContentPost, "id">) => void;
  updateContentPost: (id: string, input: Omit<ContentPost, "id">) => void;
  deleteContentPost: (id: string) => void;
};

const MagnativeDataContext = createContext<MagnativeDataContextValue | null>(null);

/**
 * Sumber state operasional modul Magnative (klien, proyek, konten sosial
 * media), dipasang SEKALI di `src/app/dashboard/magnative/layout.tsx` —
 * pola yang sama dengan MagnarentDataProvider. Karena layout modul tidak
 * pernah remount saat berpindah antar sub-rute, data ini tetap hidup
 * selama pengguna berada di dalam modul. (MVP: state hanya di memori,
 * belum tersambung Supabase.)
 */
export function MagnativeDataProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [contentPosts, setContentPosts] = useState<ContentPost[]>(INITIAL_CONTENT_POSTS);

  const addClient = useCallback((input: Omit<Client, "id">) => {
    setClients((prev) => [...prev, { ...input, id: genId("cl") }]);
  }, []);

  const updateClient = useCallback((id: string, input: Omit<Client, "id">) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...input, id } : c)));
  }, []);

  const deleteClient = useCallback((id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  }, []);

  /** Dipakai UI untuk memblokir hapus klien yang masih punya proyek aktif. */
  const getActiveProjectsForClient = useCallback(
    (clientId: string) =>
      projects.filter((p) => p.clientId === clientId && ACTIVE_PROJECT_STATUSES.includes(p.status)),
    [projects]
  );

  const addProject = useCallback((input: Omit<Project, "id">) => {
    setProjects((prev) => [...prev, { ...input, id: genId("pr") }]);
  }, []);

  const updateProject = useCallback((id: string, input: Omit<Project, "id">) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...input, id } : p)));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addContentPost = useCallback((input: Omit<ContentPost, "id">) => {
    setContentPosts((prev) => [...prev, { ...input, id: genId("cp") }]);
  }, []);

  const updateContentPost = useCallback((id: string, input: Omit<ContentPost, "id">) => {
    setContentPosts((prev) => prev.map((c) => (c.id === id ? { ...input, id } : c)));
  }, []);

  const deleteContentPost = useCallback((id: string) => {
    setContentPosts((prev) => prev.filter((c) => c.id !== id));
  }, []);

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
