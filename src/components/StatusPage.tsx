"use client";

import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import { LogoMark } from '@/components/Mark';
import { STRINGS, useLang } from '@/lib/i18n';

/** 404 ve hata sayfalari icin ortak, sade bir govde */
export function StatusPage({ kind, onRetry }: { kind: 'notFound' | 'error'; onRetry?: () => void }) {
  const t = STRINGS[useLang()];
  const copy = kind === 'notFound' ? t.notFound : t.crashed;
  return (
    <main className="min-h-dvh bg-y-canvas text-y-ink flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-[520px]">
        <LogoMark size={44} className="mb-6" />
        <h1 className="text-[32px] md:text-[44px] font-bold tracking-[-0.02em] leading-[1.1] text-balance">{copy.title}</h1>
        <p className="mt-3 text-[17px] leading-relaxed text-y-muted text-pretty">{copy.body}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {onRetry && (
            <button type="button" onClick={onRetry}
              className="min-h-11 inline-flex items-center gap-2 px-6 bg-y-accent hover:bg-y-accent-hover text-white font-bold rounded-full transition-colors duration-150">
              <RotateCcw size={16} aria-hidden="true" /> {t.retry}
            </button>
          )}
          <Link href="/"
            className={onRetry
              ? 'min-h-11 inline-flex items-center px-5 rounded-full border border-y-line-strong font-semibold hover:bg-y-surface2 transition-colors duration-150'
              : 'min-h-11 inline-flex items-center px-6 bg-y-accent hover:bg-y-accent-hover text-white font-bold rounded-full transition-colors duration-150'}>
            {t.sssBack}
          </Link>
          <Link href="/sss" className="min-h-11 inline-flex items-center px-2 font-semibold text-y-link underline underline-offset-[3px] decoration-1 hover:decoration-2">
            {t.faq}
          </Link>
        </div>
      </div>
    </main>
  );
}
