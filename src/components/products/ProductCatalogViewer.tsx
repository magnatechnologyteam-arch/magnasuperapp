"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Boxes, ImageIcon, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/shared/utils";
import { ProductDetailModal } from "./ProductDetailModal";
import type { Product, ProductDivision } from "@/lib/products/types";

const DIVISION_LABEL: Record<ProductDivision, string> = {
  magnarent: "Magnarent",
  magnativ: "Magnativ",
  production: "Production",
  umum: "Umum",
};

const DIVISION_BADGE: Record<ProductDivision, string> = {
  magnarent: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  magnativ: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
  production: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
  umum: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
};

const ALL_DIVISIONS_FILTER = "Semua Divisi";
const DIVISION_OPTIONS: ProductDivision[] = ["umum", "magnarent", "magnativ", "production"];

/**
 * Katalog produk READ-ONLY untuk SEMUA staf (Tahap 29) — beda dari
 * `ProductManager` (Owner/Finance, bisa tambah/edit/hapus): di sini cuma
 * cari & lihat detail + galeri foto, supaya tim tiap divisi bisa cek
 * apakah suatu barang sudah ada di katalog sebelum menambahkannya lagi di
 * tempat lain, dan lihat rupa produknya lewat slider foto. Dipasang di
 * `/dashboard/katalog-produk` — route ini SENGAJA di luar prefix
 * `/dashboard/admin|magnative|magnarent|production` supaya middleware
 * tidak memblokir divisi manapun (lihat src/middleware.ts).
 */
export function ProductCatalogViewer({ products }: { products: Product[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [divisionFilter, setDivisionFilter] = useState<string>(ALL_DIVISIONS_FILTER);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        (p.sku ?? "").toLowerCase().includes(term);
      const matchesDivision = divisionFilter === ALL_DIVISIONS_FILTER || p.division === divisionFilter;
      return matchesSearch && matchesDivision;
    });
  }, [products, searchTerm, divisionFilter]);

  const detailProduct = useMemo(
    () => (detailProductId ? products.find((p) => p.id === detailProductId) ?? null : null),
    [products, detailProductId]
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama, kategori, atau SKU…"
            className="w-full rounded-full border border-black/10 bg-white py-2 pl-9 pr-3.5 text-sm text-zinc-900 outline-none ring-teal-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
          />
        </div>
        <select
          value={divisionFilter}
          onChange={(e) => setDivisionFilter(e.target.value)}
          className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-sm text-zinc-700 outline-none ring-teal-500/40 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
        >
          <option>{ALL_DIVISIONS_FILTER}</option>
          {DIVISION_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {DIVISION_LABEL[d]}
            </option>
          ))}
        </select>
      </div>

      <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
        {filteredProducts.length} dari {products.length} produk ditampilkan
      </p>

      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={products.length === 0 ? "Belum ada produk" : "Tidak ada hasil"}
          description={
            products.length === 0
              ? "Belum ada produk yang ditambahkan Owner/Finance di Katalog Produk."
              : "Coba ubah kata kunci pencarian atau filter divisi."
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setDetailProductId(p.id)}
              className="group overflow-hidden rounded-2xl border border-black/5 bg-white text-left shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-zinc-900"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-white/5">
                {p.photoUrl ? (
                  <Image
                    src={p.photoUrl}
                    alt={p.name}
                    fill
                    unoptimized
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-zinc-300 dark:text-zinc-600">
                    <ImageIcon className="h-8 w-8" />
                  </span>
                )}
                {p.photos.length > 1 && (
                  <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {p.photos.length} foto
                  </span>
                )}
              </div>
              <div className="p-2.5">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{p.name}</p>
                <div className="mt-1 flex items-center justify-between gap-1.5">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", DIVISION_BADGE[p.division])}>
                    {DIVISION_LABEL[p.division]}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {formatRupiah(p.price)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <ProductDetailModal product={detailProduct} open={detailProduct !== null} onClose={() => setDetailProductId(null)} />
    </div>
  );
}
