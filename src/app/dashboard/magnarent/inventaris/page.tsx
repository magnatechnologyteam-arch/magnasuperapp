import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { InventoryManager } from "@/components/magnarent/InventoryManager";
import { PlaceholderGallery, type PlaceholderShot } from "@/components/ui/PlaceholderGallery";

const KATEGORI_SHOTS: PlaceholderShot[] = [
  {
    src: "/images/placeholders/kategori-tenda.jpg",
    title: "Tenda & Struktur",
    caption: "Foto tenda roder/sarnavil terpasang rapi di lokasi event, siang hari, dari sudut 3/4.",
  },
  {
    src: "/images/placeholders/kategori-sound.jpg",
    title: "Sound System",
    caption: "Foto unit speaker, mixer, dan kabel tersusun rapi di gudang atau saat setup panggung.",
  },
  {
    src: "/images/placeholders/kategori-genset.jpg",
    title: "Genset & Power",
    caption: "Foto unit genset dan panel distribusi listrik, tampak label kapasitas (kVA) jelas terbaca.",
  },
  {
    src: "/images/placeholders/kategori-kursi.jpg",
    title: "Kursi & Meja",
    caption: "Foto susunan kursi/meja event yang bersih dan rapi, idealnya sudah tertata seperti di venue.",
  },
  {
    src: "/images/placeholders/kategori-lighting.jpg",
    title: "Lighting & Dekorasi",
    caption: "Foto lighting panggung menyala di tempat gelap agar efek cahaya terlihat jelas.",
  },
];

export default function MagnarentInventarisPage() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Inventaris"
        description="Katalog item rental, kategori, dan stok per lokasi."
      />
      <InventoryManager />
      <PlaceholderGallery
        title="Galeri Kategori Alat (Contoh)"
        description="Template tempat foto asli tiap kategori alat akan dipasang — saat ini masih gambar dummy on-brand, belum foto sungguhan."
        shots={KATEGORI_SHOTS}
        columns={5}
      />
    </div>
  );
}
