import { BRAND_GRADIENT } from "@/lib/navigation";

/**
 * Logo MagnaSuperApp — mark tiga "kelopak" yang mengelilingi satu titik
 * pusat, melambangkan tiga lini bisnis (Magnarent, Magnative, Production)
 * yang disatukan dalam satu dashboard. Dipakai konsisten di Sidebar dan
 * halaman login/register lewat komponen ini (single source of truth),
 * dan bentuk yang sama dipakai untuk favicon di `src/app/icon.svg`.
 *
 * Desain awal/starter — gampang diganti nanti kalau sudah ada logo resmi
 * dari desainer brand: cukup ubah file ini (dan `src/app/icon.svg` untuk
 * favicon), tidak perlu sentuh halaman lain.
 */
export function BrandLogo({
  size = 36,
  rounded = "rounded-xl",
}: {
  size?: number;
  rounded?: string;
}) {
  return (
    <div
      className={`grid shrink-0 place-items-center ${rounded} shadow-sm`}
      style={{ width: size, height: size, background: BRAND_GRADIENT }}
    >
      <BrandMark size={size * 0.62} />
    </div>
  );
}

/** Glyph tiga-kelopak saja, tanpa latar — dipakai di tempat yang sudah punya latar sendiri. */
export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <g transform="translate(24,24)">
        <path
          d="M0,0 C0,-9.5 4.5,-14.5 10.5,-14.5 C13.5,-14.5 15,-12.5 15,-10 C15,-4.2 8,0 0,0 Z"
          fill="#ffffff"
          fillOpacity="0.97"
        />
        <path
          d="M0,0 C0,-9.5 4.5,-14.5 10.5,-14.5 C13.5,-14.5 15,-12.5 15,-10 C15,-4.2 8,0 0,0 Z"
          fill="#ffffff"
          fillOpacity="0.88"
          transform="rotate(120)"
        />
        <path
          d="M0,0 C0,-9.5 4.5,-14.5 10.5,-14.5 C13.5,-14.5 15,-12.5 15,-10 C15,-4.2 8,0 0,0 Z"
          fill="#ffffff"
          fillOpacity="0.78"
          transform="rotate(240)"
        />
        <circle cx="0" cy="0" r="3.2" fill="#ffffff" />
      </g>
    </svg>
  );
}
