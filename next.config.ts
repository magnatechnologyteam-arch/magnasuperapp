import type { NextConfig } from "next";

/**
 * `images.remotePatterns` perlu didaftarkan eksplisit supaya `next/image`
 * mau me-render foto portofolio Magnativ (migrasi 0012) yang URL-nya dari
 * Supabase Storage, bukan dari /public — tanpa ini Next.js menolak
 * (400 Bad Request) memuat gambar dari domain yang tidak dikenal.
 */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "xbynsiafccsfgeayakma.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
