import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { MagnativeOverview } from "@/components/magnative/MagnativeOverview";
import { PlaceholderGallery, type PlaceholderShot } from "@/components/ui/PlaceholderGallery";

const PORTOFOLIO_SHOTS: PlaceholderShot[] = [
  {
    src: "/images/placeholders/portofolio-event.jpg",
    title: "Dokumentasi Event",
    caption: "Foto suasana event yang ditangani Magnative — panggung, tamu, momen highlight acara.",
  },
  {
    src: "/images/placeholders/portofolio-konten.jpg",
    title: "Konten Sosial Media",
    caption: "Contoh hasil foto/video konten untuk klien, mis. behind-the-scenes shooting.",
  },
  {
    src: "/images/placeholders/portofolio-klien.jpg",
    title: "Showcase Klien",
    caption: "Logo/branding klien yang pernah ditangani (dengan izin klien untuk ditampilkan).",
  },
];

export default function MagnativeOverviewPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Ringkasan Magnative"
        description="Klien aktif, proyek berjalan, dan konten yang akan datang."
      />
      <MagnativeOverview />
      <PlaceholderGallery
        title="Contoh Portofolio (Placeholder)"
        description="Template galeri portofolio Magnative — ganti dengan foto/dokumentasi asli begitu tersedia."
        shots={PORTOFOLIO_SHOTS}
        columns={3}
      />
    </div>
  );
}
