import Image from "next/image";

/**
 * Logo resmi MagnaSuperApp (Tahap 30) — file gambar dari desainer brand
 * (`public/brand/logo-mark.png`), menggantikan mark pinwheel starter yang
 * dipakai sejak awal (lihat riwayat: dulu `BrandMark` SVG tiga-kelopak di
 * atas latar `BRAND_GRADIENT`). Dipakai konsisten di Sidebar, menu mobile,
 * dan halaman login/register/error lewat komponen ini (single source of
 * truth) — ganti file gambarnya saja kalau suatu saat logo diperbarui lagi,
 * tidak perlu sentuh halaman lain.
 *
 * Favicon (`src/app/icon.png`) dan ikon PWA (`public/icons/icon-*.png`,
 * `apple-touch-icon.png`) dibuat dari gambar sumber yang SAMA supaya benar-
 * benar senada dengan yang tampil di dalam aplikasi ini, bukan cuma mirip.
 */
export function BrandLogo({
  size = 36,
  rounded = "rounded-xl",
}: {
  size?: number;
  rounded?: string;
}) {
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden ${rounded} shadow-sm`}
      style={{ width: size, height: size }}
    >
      <Image src="/brand/logo-mark.png" alt="MagnaSuperApp" fill sizes={`${size}px`} className="object-cover" />
    </span>
  );
}
