import { redirect } from "next/navigation";
import { Boxes } from "lucide-react";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { rowToProduct, type ProductRow } from "@/lib/products/mappers";
import { ProductManager } from "@/components/products/ProductManager";
import { ToastProvider } from "@/components/ui/ToastProvider";

/**
 * Katalog Produk terpusat (migrasi 0013) — HANYA akses penuh, pola sama
 * seperti "Piutang & Pendapatan"/"Klien Terpadu"/"Laporan"/"Aktivitas".
 * Data produk dipakai lintas Magnarent/Magnativ/Production, diisi manual,
 * lewat import Excel/CSV di ProductManager, atau lewat API eksternal
 * (src/app/api/products/route.ts) untuk automation seperti n8n.
 */
export default async function ProdukPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.division !== "all") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<ProductRow[]>();

  if (error) console.error("[products] Gagal memuat katalog produk:", error.message);
  const products = (data ?? []).map(rowToProduct);

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
            Admin
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Katalog Produk
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Data produk terpusat — Magnarent, Magnativ, dan Production dalam satu tempat, bisa diisi manual, import
            Excel, atau otomatis lewat API.
          </p>
        </div>
      </div>

      <div className="mt-6">
        {/* ProductManager pakai useToast() untuk feedback tambah/edit/hapus/
            import — beda dari halaman admin lain (Klien/Piutang/dst) yang
            belum butuh toast, jadi provider-nya dipasang di sini saja,
            bukan lewat layout.tsx bersama di /dashboard/admin. */}
        <ToastProvider>
          <ProductManager products={products} />
        </ToastProvider>
      </div>
    </div>
  );
}
