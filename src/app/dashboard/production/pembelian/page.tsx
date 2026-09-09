import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { PurchaseOrderManager } from "@/components/production/PurchaseOrderManager";

export default function ProductionPembelianPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Pembelian (PO)"
        description="Catat pesanan material ke supplier — begitu diterima, stok gudang otomatis bertambah."
      />
      <PurchaseOrderManager />
    </div>
  );
}
