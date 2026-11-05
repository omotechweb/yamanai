import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Arama motorlari siteyi tek adresten tanisin diye www adresini ana adrese yonlendir
  // Hakkinda sayfasi public/hakkinda altindaki duz HTML'dir (npm run sync:hakkinda)
  async rewrites() {
    return [{ source: '/hakkinda', destination: '/hakkinda/index.html' }];
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
