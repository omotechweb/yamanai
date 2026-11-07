"use client";

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LogoMark } from '@/components/Mark';
import { useIsDesktopApp } from '@/lib/desktop';
import { STRINGS, useLang } from '@/lib/i18n';

// ─── Provider config ─────────────────────────────────────────────────────────

const PROVIDERS = [
  {
    id: 'google',
    label: 'google' as const,
    cls: 'bg-white hover:bg-gray-50 border-gray-300 text-gray-800',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: 'github',
    label: 'github' as const,
    cls: 'bg-[#24292f] hover:bg-[#2f363d] border-[#444d56] text-white',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    ),
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

function GirisForm() {
  const t = STRINGS[useLang()];
  const isDesktopApp  = useIsDesktopApp();
  const searchParams  = useSearchParams();
  const errorCode     = searchParams.get('error');
  const errorMessage  = errorCode ? (t.authErrors[errorCode] ?? t.authErrors.Default) : null;

  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSignIn = async (providerId: string) => {
    setLoadingId(providerId);
    try {
      await signIn(providerId, { callbackUrl: '/' });
    } catch {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-dvh bg-y-canvas text-y-ink flex flex-col md:flex-row">
      <div className="bg-y-side text-y-side-ink px-6 py-5 md:w-[288px] md:flex-shrink-0">
        <Link href="/" tabIndex={isDesktopApp ? -1 : undefined} className={`inline-flex items-center gap-2.5 min-h-11 rounded-lg y-on-side ${isDesktopApp ? 'pointer-events-none' : ''}`}>
          <LogoMark size={30} />
          <span className="y-display font-extrabold text-xl tracking-tight">YamanAI</span>
        </Link>
      </div>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="y-display text-3xl font-bold tracking-tight">{t.loginHeading}</h1>
          <p className="text-y-muted mt-2 mb-7 leading-relaxed">{isDesktopApp ? t.loginSubDesktop : t.loginSub}</p>

          {errorMessage && (
            <div role="alert" className="flex items-start gap-3 p-3.5 mb-5 rounded-xl border border-y-danger/40 text-y-danger text-sm">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-3">
            {PROVIDERS.map((p) => {
              const isLoading = loadingId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSignIn(p.id)}
                  disabled={loadingId !== null}
                  className={`w-full min-h-12 flex items-center gap-3 px-5 border rounded-full font-semibold transition-[background-color,transform] duration-150 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] ${p.cls}`}
                >
                  {isLoading ? <Loader2 size={20} className="animate-spin motion-reduce:animate-none" /> : p.icon}
                  <span className="flex-1 text-left">{isLoading ? t.redirecting : t[p.label]}</span>
                </button>
              );
            })}
          </div>

          {!isDesktopApp && (
            <Link href="/" className="mt-6 inline-flex items-center gap-2 min-h-11 text-sm font-medium text-y-muted hover:text-y-ink rounded-lg transition-colors duration-150">
              <ArrowLeft size={16} /> {t.backToChat}
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}

export default function GirisPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-y-canvas" />}>
      <GirisForm />
    </Suspense>
  );
}
