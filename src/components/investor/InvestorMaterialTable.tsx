import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRupiah } from "@/lib/shared/utils";
import { cn } from "@/lib/cn";
import type { MaterialItem } from "@/lib/production/types";

/** Tabel stok material Production, versi read only untuk investor — baris stok menipis ditandai. */
export function InvestorMaterialTable({ materials }: { materials: MaterialItem[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
              <th className="px-5 py-3">Material</th>
              <th className="px-5 py-3">Kategori</th>
              <th className="px-5 py-3">Lokasi</th>
              <th className="px-5 py-3 text-right">Stok</th>
              <th className="px-5 py-3 text-right">Harga/Satuan</th>
            </tr>
          </thead>
          <tbody>
            {materials.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    icon={AlertTriangle}
                    title="Belum ada material"
                    description="Begitu Production mencatat stok material, langsung muncul di sini."
                  />
                </td>
              </tr>
            )}
            {materials.map((m) => {
              const low = m.stock <= m.minStock;
              return (
                <tr key={m.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{m.name}</td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{m.category}</td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{m.location}</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold",
                        low
                          ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                          : "text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      {low && <AlertTriangle className="h-3 w-3" />}
                      {m.stock} {m.unit}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {formatRupiah(m.pricePerUnit)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
