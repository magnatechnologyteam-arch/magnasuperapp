import { redirect } from "next/navigation";

/**
 * Rute lama — "Gudang" dan "Material" sekarang digabung jadi satu tab
 * "Material" (lihat src/lib/navigation.ts). File ini dibiarkan sebagai
 * redirect, bukan dihapus, supaya bookmark/link lama ke /gudang tidak
 * berakhir 404.
 */
export default function ProductionGudangRedirectPage() {
  redirect("/dashboard/production/material");
}
