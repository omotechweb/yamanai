import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Giris sayfalari burada engellenmez: Google'in noindex etiketini gorebilmesi icin taranabilmeleri gerekir
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
