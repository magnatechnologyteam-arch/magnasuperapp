import type { ReactNode } from "react";
import { SubNav } from "@/components/layout/SubNav";
import { MODULES } from "@/lib/navigation";
import { ProductionDataProvider } from "@/components/production/ProductionDataProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { createClient } from "@/lib/supabase/server";
import {
  rowToBoothProject,
  rowToMaterial,
  type BoothProjectRow,
  type MaterialRow,
} from "@/lib/production/mappers";
import { rowToClient, type ClientRow } from "@/lib/magnative/mappers";

const mod = MODULES.find((m) => m.id === "production")!;

/**
 * Layout modul Production — Server Component ini mengambil data material
 * gudang dan proyek booth dari Supabase (bukan lagi mock data statis) dan
 * meneruskannya sebagai props ke `ProductionDataProvider`. Pola persis sama
 * dengan layout Magnarent/Magnative: begitu ada mutasi lewat Server Action
 * di `src/lib/production/actions.ts`, `revalidatePath` membuat layout ini
 * dijalankan ulang otomatis dengan data terbaru.
 */
export default async function ProductionLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const [materialsResult, projectsResult, clientsResult] = await Promise.all([
    supabase.from("production_materials").select("*").order("created_at", { ascending: true }).returns<MaterialRow[]>(),
    supabase
      .from("production_booth_projects")
      .select("*")
      .order("tanggal_instalasi", { ascending: true })
      .returns<BoothProjectRow[]>(),
    // Daftar klien Magnative — dibaca di sini cuma untuk pilihan "Klien
    // Terdaftar" di form proyek booth (migrasi 0010 sudah mengizinkan siapa
    // pun yang login membaca tabel ini). Kepemilikan datanya tetap di Magnative.
    supabase.from("magnative_clients").select("*").order("name", { ascending: true }).returns<ClientRow[]>(),
  ]);

  if (materialsResult.error) console.error("[production] Gagal memuat material:", materialsResult.error.message);
  if (projectsResult.error) console.error("[production] Gagal memuat proyek booth:", projectsResult.error.message);
  if (clientsResult.error) console.error("[production] Gagal memuat daftar klien:", clientsResult.error.message);

  const materials = (materialsResult.data ?? []).map(rowToMaterial);
  const projects = (projectsResult.data ?? []).map(rowToBoothProject);
  const clients = (clientsResult.data ?? []).map(rowToClient);

  return (
    <ToastProvider>
      <ProductionDataProvider materials={materials} projects={projects} clients={clients}>
        <div>
          <SubNav items={mod.subnav} gradient={mod.gradient} />
          <div className="p-4 md:p-8">{children}</div>
        </div>
      </ProductionDataProvider>
    </ToastProvider>
  );
}
