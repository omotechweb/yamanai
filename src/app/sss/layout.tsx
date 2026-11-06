import type { Metadata } from 'next';
import { STRINGS } from '@/lib/strings';
import { SITE_URL } from '@/lib/site';

const title = 'Sıkça Sorulan Sorular';
const description =
  'YamanAI hakkında merak edilenler: ücretsiz kullanım, günlük mesaj limiti, yapay zekâ modelleri, gizlilik ve Windows masaüstü uygulaması.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/sss' },
  // Kendi openGraph'i ust katmandakinin yerine gectigi icin gorsel burada yeniden belirtilir
  openGraph: { title: `${title} | YamanAI`, description, url: '/sss', images: ['/opengraph-image'] },
};

// Arama sonuclarinda sorular acilir liste olarak gorunebilsin; sayfa Turkce dizine eklenir
const FAQ_DATA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': `${SITE_URL}/sss#faq`,
  inLanguage: 'tr',
  mainEntity: STRINGS.tr.faqItems.map(item => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
};

export default function SssLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_DATA).replace(/</g, '\u003c') }} />
      {children}
    </>
  );
}
