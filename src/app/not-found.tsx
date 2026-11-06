import type { Metadata } from 'next';
import { StatusPage } from '@/components/StatusPage';

export const metadata: Metadata = {
  title: 'Sayfa bulunamadı',
  robots: { index: false },
};

export default function NotFound() {
  return <StatusPage kind="notFound" />;
}
