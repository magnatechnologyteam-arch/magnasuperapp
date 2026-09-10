import { PackageSearch } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { rowToBoothProject, rowToMaterial, type BoothProjectRow, type MaterialRow } from "@/lib/production/mappers";
import { InvestorSectionHeader } from "@/components/investor/InvestorSectionHeader";
import { InvestorBoothTable } from "@/components/investor/InvestorBoothTable";
import { InvestorMaterialTable } from "@/components/investor/InvestorMaterialTable";

/**
 * Rincian Production untuk investor — proyek booth DAN stok material,
 * bukan cuma dua angka ringkasan. Read only lewat policy SELECT investor
 * (migrasi 0019).
 */
export default async function InvestorProductionPage() {
  const supabase = await createClient();
  const [projectsRes, materialsRes] = await Promise.all([
    supabase
      .from("production_booth_projects")
      .select("*")
      .order("tanggal_instalasi", { ascending: false })
      .returns<BoothProjectRow[]>(),
    supabase.from("production_materials").select("*").order("name").returns<MaterialRow[]>(),
  ]);

  const projects = (projectsRes.data ?? []).map(rowToBoothProject);
  const materials = (materialsRes.data ?? []).map(rowToMaterial);
  const stokMenipis = materials.filter((m) => m.stock <= m.minStock).length;

  return (
    <div>
      <InvestorSectionHeader
        icon={PackageSearch}
        eyebrow="Investor"
        title="Production — Proyek Booth & Material"
        description={`${projects.length} proyek booth, ${stokMenipis} material stok menipis.`}
        accent="#F59E0B"
      />

      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        Proyek Booth
      </p>
      <div className="mb-8">
        <InvestorBoothTable projects={projects} />
      </div>

      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        Gudang & Material
      </p>
      <InvestorMaterialTable materials={materials} />
    </div>
  );
}
