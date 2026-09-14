import { Boxes } from "lucide-react";
import { getImportSources, getProductsWithPhotos } from "@/lib/products/data";
import { ImportSourceManager } from "@/components/products/ImportSourceManager";
import { ProductManager } from "@/components/products/ProductManager";
import { ToastProvider } from "@/components/ui/ToastProvider";

/**
 * Katalog Produk untuk SEMUA staf (Tahap 29b) — awalnya (Tahap 29) halaman
 * ini read-only, tapi permintaan Owner berubah: "katalog produk diubah
 * jadi semua divisi bisa akses edit". Jadi sekarang komponennya SAMA
 * PERSIS dengan `/dashboard/admin/produk` (ProductManager + ImportSourceManager,
 * full CRUD + impor) — bedanya cuma di mana halaman ini didaftarkan:
 * `/dashboard/admin/produk` tetap ada untuk Owner/Finance lewat menu
 * Admin, halaman ini SENGAJA di luar prefix
 * `/dashboard/admin|magnative|magnarent|production` (lihat
 * src/middleware.ts) supaya staf divisi manapun bisa buka & edit
 * langsung dari subnav modul masing-masing.
 *
 * RLS tabel `products`/`product_photos`/`product_import_sources` sudah
 * dilebarkan ke SEMUA staf login lewat migrasi 0030 (sebelumnya cuma
 * division "all") — jadi tidak ada penjagaan divisi tambahan di sini
 * sama sekali, sengaja disamakan dengan halaman admin.
 */
export default async function KatalogProdukPage() {
  const [products, importSources] = await Promise.all([getProductsWithPhotos(), getImportSources()]);

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
            Data produk terpusat — Magnarent, Magnativ, dan Production dalam satu tempat. Semua staf yang login bisa
            tambah/edit/hapus produk & foto di sini, atau impor otomatis dari WhatsApp Catalog/website.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <ToastProvider>
          <div className="space-y-5">
            <ImportSourceManager sources={importSources} />
            <ProductManager products={products} />
          </div>
        </ToastProvider>
      </div>
    </div>
  );
}
