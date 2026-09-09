import type { ReactNode } from "react";
import { SubNav } from "@/components/layout/SubNav";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { requireInvestorAccess } from "@/lib/capital-requests/actions";

const INVESTOR_GRADIENT = "linear-gradient(135deg, #10B981 0%, #059669 100%)";

const INVESTOR_SUBNAV = [
  { label: "Ringkasan", href: "/dashboard/investor" },
  { label: "Pengajuan Modal", href: "/dashboard/investor/pengajuan-modal" },
];

/**
 * Area khusus akun investor — read only lintas divisi + kotak masuk
 * Pengajuan Modal (lihat migrasi 0019). `requireInvestorAccess()` menolak
 * siapa pun selain division "investor"/"all" (jaring pengaman server, sama
 * seperti `requireFullAccess()` di dashboard/admin/actions.ts — middleware
 * sudah menjaga rute ini tapi WAJIB dicek ulang di server juga).
 */
export default async function InvestorLayout({ children }: { children: ReactNode }) {
  await requireInvestorAccess();

  return (
    <ToastProvider>
      <div>
        <SubNav items={INVESTOR_SUBNAV} gradient={INVESTOR_GRADIENT} />
        <div className="p-4 md:p-8">{children}</div>
      </div>
    </ToastProvider>
  );
}
