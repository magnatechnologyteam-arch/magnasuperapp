import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { InventoryManager } from "@/components/magnarent/InventoryManager";

export default function MagnarentInventarisPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Inventaris"
        description="Katalog item rental, kategori, dan stok per lokasi."
      />
      <InventoryManager />
    </div>
  );
}
