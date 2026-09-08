import { redirect } from "next/navigation";

/**
 * "/" tidak dipakai sebagai halaman sendiri — cukup lempar ke /dashboard.
 * Middleware (src/middleware.ts) yang akan mengarahkan lebih lanjut ke
 * /login kalau pengguna belum punya sesi.
 */
export default function RootPage() {
  redirect("/dashboard");
}
