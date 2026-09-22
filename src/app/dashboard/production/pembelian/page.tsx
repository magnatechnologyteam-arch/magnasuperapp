import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { PurchaseOrderManager } from "@/components/production/PurchaseOrderManager";
import { getVendors } from "@/lib/production/extras-actions";

/**
 * Halaman Pembelian (PO) — sekarang async server component supaya bisa
 * fetch `getVendors()` (Tahap 44) dan diteruskan ke `PurchaseOrderManager`
 * untuk picker vendor opsional di form Buat PO. Vendor dikelola terpisah
 * di tab "Vendor".
 */
export default async function ProductionPembelianPage() {
  const vendors = await getVendors();

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Pembelian (PO)"
        description="Catat pesanan material ke supplier — begitu diterima, stok gudang otomatis bertambah."
      />
      <PurchaseOrderManager vendors={vendors} />
    </div>
  );
}
