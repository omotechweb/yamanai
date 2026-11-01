import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Masaüstü girişi',
  alternates: { canonical: '/masaustu-giris' },
  robots: { index: false, follow: false },
};

export default function MasaustuGirisLayout({ children }: { children: React.ReactNode }) {
  return children;
}
