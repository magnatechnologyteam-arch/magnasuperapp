import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { VendorManager } from "@/components/production/VendorManager";
import { getVendors } from "@/lib/production/extras-actions";

/**
 * Halaman Database Vendor/Supplier (Tahap 44 — gap #5
 * analisis-gap-production.md). Sebelumnya nama supplier di PO cuma teks
 * bebas; sekarang ada master data kontak & kategori yang bisa dipilih
 * langsung di form Buat PO (tetap boleh isi manual kalau vendor belum
 * terdaftar).
 */
export default async function ProductionVendorPage() {
  const vendors = await getVendors();

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Database Vendor"
        description="Kontak & kategori vendor/supplier — dipakai sebagai picker opsional saat buat Purchase Order."
      />
      <VendorManager vendors={vendors} />
    </div>
  );
}
