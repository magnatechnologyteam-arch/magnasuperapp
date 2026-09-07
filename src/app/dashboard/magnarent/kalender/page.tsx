import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { BookingCalendar } from "@/components/magnarent/BookingCalendar";

export default function MagnarentKalenderPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Kalender"
        description="Ketersediaan item secara real-time per rentang tanggal."
      />
      <BookingCalendar />
    </div>
  );
}
