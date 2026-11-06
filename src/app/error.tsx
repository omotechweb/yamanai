"use client";

import { useEffect } from 'react';
import { StatusPage } from '@/components/StatusPage';

// Beklenmeyen bir hata tum sayfayi bembeyaz birakmasin; sohbetler localStorage'da durur
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <StatusPage kind="error" onRetry={reset} />;
}
