import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Site her derlemede yeniden yayinlanir; derleme ani "son degisiklik" olarak yeterince dogrudur
const BUILT_AT = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, lastModified: BUILT_AT, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/sss`, lastModified: BUILT_AT, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/hakkinda`, lastModified: BUILT_AT, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
