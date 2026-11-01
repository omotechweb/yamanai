"use client";

import { Suspense, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { STRINGS, useLang } from '@/lib/i18n';

// Masaustu uygulamasi kullanicinin tarayicisini bu sayfaya acar: giris burada baslar,
// bitince oturum /api/desktop/complete uzerinden uygulamaya aktarilir.
function MasaustuGiris() {
  const t = STRINGS[useLang()];
  const params = useSearchParams();
  const provider = params.get('provider');
  const port = params.get('port');
  const challenge = params.get('challenge');
  const valid = (provider === 'google' || provider === 'github') && !!port && !!challenge;
  const started = useRef(false);

  useEffect(() => {
    if (!valid || started.current) return;
    started.current = true;
    const query = new URLSearchParams({ port, challenge }).toString();
    signIn(provider, { callbackUrl: `${window.location.origin}/api/desktop/complete?${query}` });
  }, [valid, provider, port, challenge]);

  return (
    <main className="min-h-dvh bg-y-canvas text-y-ink flex items-center justify-center p-6">
      {valid ? (
        <p role="status" className="flex items-center gap-3 text-y-muted">
          <Loader2 size={20} className="animate-spin motion-reduce:animate-none" /> {t.redirecting}
        </p>
      ) : (
        <p role="alert" className="text-y-danger">{t.authErrors.Default}</p>
      )}
    </main>
  );
}

export default function MasaustuGirisPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-y-canvas" />}>
      <MasaustuGiris />
    </Suspense>
  );
}
