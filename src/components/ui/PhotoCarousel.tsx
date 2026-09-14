"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type CarouselPhoto = { id: string; url: string };

/**
 * Slider foto generik (Tahap 29) — TIDAK ADA komponen carousel/gallery
 * dengan navigasi next/prev di codebase sebelum ini (semua "gallery" yang
 * ada, mis. `DocumentationGallery`/`PortfolioGallery`, adalah grid statis,
 * bukan slider satu-per-satu) — dibuat baru dan digenerikkan (bukan
 * spesifik produk) supaya bisa dipakai ulang di tempat lain nanti kalau
 * perlu. Dipakai pertama kali untuk galeri foto produk di Katalog Produk.
 *
 * `aspect` mengontrol rasio area gambar utama — default "square" cocok
 * untuk thumbnail produk, "video" (16:9) untuk konteks lain.
 */
export function PhotoCarousel({
  photos,
  emptyLabel = "Belum ada foto.",
  aspect = "square",
  className,
}: {
  photos: CarouselPhoto[];
  emptyLabel?: string;
  aspect?: "square" | "video";
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const clampedIndex = photos.length === 0 ? 0 : Math.min(index, photos.length - 1);
  const current = photos[clampedIndex];

  function go(delta: number) {
    if (photos.length === 0) return;
    setIndex((i) => (i + delta + photos.length) % photos.length);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-white/5",
          aspect === "square" ? "aspect-square" : "aspect-video"
        )}
      >
        {current ? (
          <Image src={current.url} alt="" fill className="object-cover" unoptimized />
        ) : (
          <span className="grid h-full w-full place-items-center text-zinc-300 dark:text-zinc-600">
            <ImageIcon className="h-10 w-10" />
          </span>
        )}

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Foto sebelumnya"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur transition-opacity hover:bg-black/70"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Foto berikutnya"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur transition-opacity hover:bg-black/70"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
              {clampedIndex + 1}/{photos.length}
            </span>
          </>
        )}
      </div>

      {photos.length === 0 && (
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">{emptyLabel}</p>
      )}

      {photos.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Lihat foto ${i + 1}`}
              className={cn(
                "relative h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-2 transition-all",
                i === clampedIndex ? "ring-teal-500" : "ring-transparent opacity-70 hover:opacity-100"
              )}
            >
              <Image src={p.url} alt="" fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
