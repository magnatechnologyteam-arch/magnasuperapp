import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { BookingScheduler } from "@/components/magnarent/BookingScheduler";

export default function MagnarentBookingPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Booking"
        description="Daftar reservasi aktif, riwayat, dan status konfirmasi."
      />
      <BookingScheduler />
    </div>
  );
}
