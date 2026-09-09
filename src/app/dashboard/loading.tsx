import { Loader2 } from "lucide-react";

/**
 * Tampil otomatis (lewat Suspense boundary yang dipasang Next.js) selagi
 * Server Component halaman manapun di dalam `/dashboard/**` masih mengambil
 * data dari Supabase — Sidebar/Topbar (AppShell) tetap tampil karena file ini
 * cuma menggantikan area konten, bukan seluruh layout. Sebelum ini ada,
 * navigasi ke halaman yang datanya agak lama diambil terasa "macet" (area
 * konten kosong tanpa tanda apa pun sedang memuat).
 */
export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-zinc-400 dark:text-zinc-500">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      <p className="text-sm font-medium">Memuat…</p>
    </div>
  );
}
