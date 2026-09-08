import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { BoothProjectManager } from "@/components/production/BoothProjectManager";
import { PlaceholderGallery, type PlaceholderShot } from "@/components/ui/PlaceholderGallery";

const TAHAP_SHOTS: PlaceholderShot[] = [
  {
    src: "/images/placeholders/tahap-desain.jpg",
    title: "Desain",
    caption: "Screenshot mockup/render 3D desain booth sebelum masuk produksi.",
  },
  {
    src: "/images/placeholders/tahap-produksi.jpg",
    title: "Produksi",
    caption: "Foto proses pengerjaan rangka/panel booth berlangsung di workshop.",
  },
  {
    src: "/images/placeholders/tahap-finishing.jpg",
    title: "Finishing",
    caption: "Foto detail finishing — cat, stiker/branding, quality check sebelum kirim.",
  },
  {
    src: "/images/placeholders/tahap-instalasi.jpg",
    title: "Instalasi",
    caption: "Foto pemasangan booth di lokasi acara klien, idealnya sebelum & sesudah selesai terpasang.",
  },
];

export default function ProductionProyekPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Proyek Booth"
        description="Tracking proyek booth per klien, dari desain hingga instalasi."
      />
      <BoothProjectManager />
      <PlaceholderGallery
        title="Dokumentasi Tahapan Produksi (Contoh)"
        description="Template galeri progres per tahap — nantinya tiap proyek bisa diisi foto asli sesuai tahapannya."
        shots={TAHAP_SHOTS}
        columns={4}
      />
    </div>
  );
}
