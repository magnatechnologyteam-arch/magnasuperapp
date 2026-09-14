import { Boxes } from "lucide-react";
import { getProductsWithPhotos } from "@/lib/products/data";
import { ProductCatalogViewer } from "@/components/products/ProductCatalogViewer";

/**
 * Katalog Produk READ-ONLY untuk SEMUA staf (Tahap 29) — beda dari
 * `/dashboard/admin/produk` (Owner/Finance, bisa tambah/edit/hapus).
 * Permintaan Owner: "tim bisa lihat detail gambar produk" & cek apakah
 * suatu barang sudah ada di katalog — jadi RLS baca `products`/
 * `product_photos` dilebarkan ke semua staf login (migrasi 0029), dan
 * halaman ini SENGAJA ditaruh di luar prefix
 * `/dashboard/admin|magnative|magnarent|production` supaya middleware
 * (src/middleware.ts) tidak memblokir divisi manapun — cukup login, bisa
 * buka halaman ini.
 */
export default async function KatalogProdukPage() {
  const products = await getProductsWithPhotos();

  return (
    <div className="p-4 md:p-8">
      <div className="animate-fade-up flex items-start gap-4">
        <div className="relative shrink-0">
          <span
            className="absolute -inset-1.5 animate-pulse rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 opacity-30 blur-lg"
            aria-hidden
          />
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-sm">
            <Boxes className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-500 dark:text-teal-400">
            Katalog
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Katalog Produk
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Cari produk yang sudah ada & lihat semua foto sebelum menambahkan yang baru. Untuk menambah/mengubah data
            produk, hubungi Owner/Finance.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <ProductCatalogViewer products={products} />
      </div>
    </div>
  );
}
