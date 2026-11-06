import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Arama motorlari siteyi tek adresten tanisin diye www adresini ana adrese yonlendir
  // Hakkinda sayfasi public/hakkinda altindaki duz HTML'dir (npm run sync:hakkinda)
  async rewrites() {
    return [{ source: '/hakkinda', destination: '/hakkinda/index.html' }];
  },
  // Temel guvenlik basliklari. Tam bir CSP bilerek yok: canli onizleme iframe'i (srcdoc) sayfanin
  // CSP'sini miras alir ve cdn.jsdelivr.net'ten React yukler, CSP onu bozar.
  // X-Frame-Options yalnizca gercek yanitlara uygulanir, srcdoc iframe'i etkilemez.
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        // Mikrofon yalnizca sitenin kendisi icin (sesli sohbet); onizlemedeki kod isteyemez
        { key: 'Permissions-Policy', value: 'microphone=(self), camera=(), geolocation=(), payment=()' },
      ],
    }];
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.yamanai.net' }],
        destination: 'https://yamanai.net/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
