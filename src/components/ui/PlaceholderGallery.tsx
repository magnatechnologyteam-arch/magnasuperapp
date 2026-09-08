import Image from "next/image";
import { Camera } from "lucide-react";

export type PlaceholderShot = {
  /** Path relatif di /public, mis. "/images/placeholders/kategori-tenda.jpg" */
  src: string;
  /** Judul singkat di atas gambar */
  title: string;
  /** Keterangan foto asli apa yang seharusnya menggantikan gambar ini */
  caption: string;
};

/**
 * Galeri foto dummy/placeholder bergaya on-brand (bukan foto asli, bukan
 * foto AI) — dipasang sebagai "template" tempat foto asli nanti akan
 * dipasang. Setiap kartu punya keterangan foto apa yang perlu diambil,
 * dan badge "Contoh" di pojok supaya jelas bagi siapa pun yang melihat
 * (termasuk owner) bahwa ini bukan foto produk sungguhan.
 *
 * Frontend-only — tidak menyentuh skema Supabase. Saat foto asli sudah
 * ada, tinggal ganti file di /public/images/placeholders/ (atau ganti
 * `src` di sini) dengan foto sungguhan.
 */
export function PlaceholderGallery({
  title,
  description,
  shots,
  columns = 3,
}: {
  title: string;
  description?: string;
  shots: PlaceholderShot[];
  columns?: 3 | 4 | 5;
}) {
  const gridCols =
    columns === 5
      ? "sm:grid-cols-2 lg:grid-cols-5"
      : columns === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{title}</h3>
          {description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
          )}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-zinc-900/90 px-2.5 py-1 text-[11px] font-semibold text-white dark:bg-white/10">
          <Camera className="h-3 w-3" />
          Placeholder sementara
        </span>
      </div>
      <div className={`grid gap-3 ${gridCols}`}>
        {shots.map((shot) => (
          <figure
            key={shot.src}
            className="group overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900"
          >
            <div className="relative aspect-video w-full overflow-hidden">
              <Image
                src={shot.src}
                alt={`Contoh placeholder: ${shot.title}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <figcaption className="p-3">
              <p className="text-xs font-bold text-zinc-900 dark:text-white">{shot.title}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                {shot.caption}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
