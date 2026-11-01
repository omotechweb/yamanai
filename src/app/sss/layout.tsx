import type { Metadata } from 'next';

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

export default function SssLayout({ children }: { children: React.ReactNode }) {
  return children;
}
