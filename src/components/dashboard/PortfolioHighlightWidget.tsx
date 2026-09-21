import Link from "next/link";
import Image from "next/image";
import { Camera, Images } from "lucide-react";
import { GLASS_BORDER, GLASS_SURFACE } from "@/lib/glass";
import { cn } from "@/lib/cn";
import type { PortfolioFolder } from "@/lib/magnative/types";

/**
 * Widget "Portofolio Terbaru" di Dashboard Hub (Update Opsional 1 butir 5)
 * — SENGAJA dipanggil di `dashboard/page.tsx` TANPA gating
 * `visibleModuleIds.has("magnative")` seperti section lain di Hub, sesuai
 * permintaan: "portofolio... jadikan tampil di keseluruhan agar semua
 * divisi bisa melihat... diletakan di dasbord hub jadi langsung terlihat
 * setelah open aplikasi". Klik kartu/link "Lihat Semua" mengarah ke
 * halaman Ringkasan Magnativ, tempat folder ini bisa dibuka penuh (slide
 * semua foto lewat `PhotoCarousel`) via `PortfolioGallery`.
 */
export function PortfolioHighlightWidget({ folders }: { folders: PortfolioFolder[] }) {
  if (folders.length === 0) return null;
  const highlights = folders.slice(0, 6);

  return (
    <div className="mb-8 animate-fade-up" style={{ animationDelay: "90ms" }}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Portofolio Terbaru
        </p>
        <Link
          href="/dashboard/magnative"
          className="text-xs font-semibold text-fuchsia-600 transition-colors hover:text-fuchsia-700 dark:text-fuchsia-300"
        >
          Lihat Semua
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {highlights.map((folder) => (
          <Link
            key={folder.id}
            href="/dashboard/magnative"
            className={cn(
              "group overflow-hidden rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-md",
              GLASS_SURFACE,
              GLASS_BORDER
            )}
          >
            <div className="relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-white/5">
              {folder.photos[0] ? (
                <Image
                  src={folder.photos[0].photoUrl}
                  alt={folder.title}
                  fill
                  sizes="(max-width: 640px) 33vw, 16vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  unoptimized
                />
              ) : (
                <span className="grid h-full w-full place-items-center text-zinc-300 dark:text-zinc-600">
                  <Camera className="h-6 w-6" />
                </span>
              )}
              {folder.photos.length > 1 && (
                <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                  <Images className="h-2.5 w-2.5" />
                  {folder.photos.length}
                </span>
              )}
            </div>
            <p className="truncate p-2 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">{folder.title}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
