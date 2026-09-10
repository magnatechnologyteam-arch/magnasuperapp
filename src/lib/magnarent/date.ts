/**
 * Dulu file ini isinya salinan identik dari `src/lib/shared/utils.ts`
 * (`todayISO`/`formatDateID`/`genId` sama persis) — disatukan jadi
 * re-export tunggal supaya perbaikan bug (mis. `todayISO` yang sekarang
 * dihitung menurut WIB, bukan UTC server) otomatis berlaku di sini juga,
 * tanpa perlu diingat-ingat untuk ditambal dua tempat.
 */
export { todayISO, formatDateID, genId } from "@/lib/shared/utils";
