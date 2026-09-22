import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { MaterialReuseReport } from "@/components/production/MaterialReuseReport";
import { MrpReport } from "@/components/production/MrpReport";

/**
 * Halaman Pemakaian & Proyeksi Material — digabung dengan MRP sederhana
 * (Tahap 44 — gap #1 analisis-gap-production.md) supaya Owner cek pola
 * pemakaian historis DAN proyeksi kebutuhan ke depan di satu tempat yang
 * sama-sama soal "material apa yang butuh perhatian". `MrpReport` murni
 * turunan client-side dari data yang sudah ada di `ProductionDataProvider`
 * — tidak ada fetch/Server Action baru untuk halaman ini. Satu
 * `ModuleHeader` saja di puncak (bukan dobel) supaya badge logo divisi
 * tidak berulang; dua bagian di bawahnya dipisah judul biasa.
 */
export default function ProductionPemakaianPage() {
  return (
    <div className="space-y-10">
      <ModuleHeader
        title="Pemakaian & Proyeksi Material"
        description="Proyeksi kebutuhan pembelian ke depan (MRP), plus pola pemakaian material lintas proyek booth."
      />
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Proyeksi Kebutuhan (MRP)</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Berdasar alokasi proyek aktif & PO yang sudah berjalan — bukan cuma alarm stok menipis.
          </p>
        </div>
        <MrpReport />
      </div>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Pemakaian Material</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Material mana yang paling sering dipakai ulang lintas proyek, dan mana yang belum pernah tersentuh.
          </p>
        </div>
        <MaterialReuseReport />
      </div>
    </div>
  );
}
