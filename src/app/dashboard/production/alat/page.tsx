import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { EquipmentManager } from "@/components/production/EquipmentManager";
import { getEquipment } from "@/lib/production/extras-actions";

/**
 * Halaman Alat & Perkakas (Tahap 28c) — registry alat berat/perkakas milik
 * tim Production (bukan material konsumsi, itu tetap di "Material"/Gudang)
 * + riwayat pemakaian per alat, dibuka lewat modal di `EquipmentManager`.
 * `getEquipment` (Server Action) dipakai langsung sebagai fetch data di sini
 * (bukan lewat query Supabase manual) supaya tipe barisnya konsisten dengan
 * yang dipakai mutasi — data alat sengaja TIDAK ditaruh di
 * `ProductionDataProvider` (menghindari memperbesar context untuk fitur yang
 * jarang dibuka), sama seperti pola `ContentRequestManager` di Magnativ.
 */
export default async function ProductionAlatPage() {
  const equipment = await getEquipment();

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Alat & Perkakas"
        description="Registry alat berat/perkakas tim Production dan riwayat pemakaiannya per proyek."
      />
      <EquipmentManager equipment={equipment} />
    </div>
  );
}
