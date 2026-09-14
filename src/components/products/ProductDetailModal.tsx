"use client";

import { Modal } from "@/components/ui/Modal";
import { PhotoCarousel } from "@/components/ui/PhotoCarousel";
import { formatRupiah } from "@/lib/shared/utils";
import type { Product, ProductDivision } from "@/lib/products/types";

const DIVISION_LABEL: Record<ProductDivision, string> = {
  magnarent: "Magnarent",
  magnativ: "Magnativ",
  production: "Production",
  umum: "Umum",
};

/**
 * Detail produk READ-ONLY (Tahap 29) — dipakai dua tempat: halaman
 * "Katalog Produk" (Owner/Finance, lihat cepat tanpa buka form edit) dan
 * halaman baru untuk semua tim (`/dashboard/katalog-produk`) yang cuma
 * boleh melihat, bukan mengubah. Slider foto pakai `PhotoCarousel` — satu
 * satunya tempat tim non-Owner/Finance bisa lihat semua foto satu produk,
 * bukan cuma foto sampul di daftar/grid.
 */
export function ProductDetailModal({ product, open, onClose }: { product: Product | null; open: boolean; onClose: () => void }) {
  if (!product) return null;

  return (
    <Modal open={open} onClose={onClose} title={product.name}>
      <div className="space-y-4">
        <PhotoCarousel photos={product.photos.map((p) => ({ id: p.id, url: p.url }))} />

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
            {DIVISION_LABEL[product.division]}
          </span>
          {product.category && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
              {product.category}
            </span>
          )}
          {product.sku && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
              SKU: {product.sku}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-black/5 bg-zinc-50 p-3.5 dark:border-white/10 dark:bg-white/5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Harga</p>
            <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-white">
              {formatRupiah(product.price)}
              <span className="ml-1 text-xs font-normal text-zinc-400">/{product.unit}</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Stok</p>
            <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-white">{product.stock}</p>
          </div>
          {product.supplier && (
            <div className="col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Supplier</p>
              <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-200">{product.supplier}</p>
            </div>
          )}
        </div>

        {product.catatan && (
          <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            {product.catatan}
          </p>
        )}
      </div>
    </Modal>
  );
}
