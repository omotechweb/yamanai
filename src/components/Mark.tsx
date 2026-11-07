"use client";

import { memo, useMemo } from 'react';
import { chatSwatch } from '@/lib/ebru';

const TEAR = 'M12 1.5c4.6 5.2 8.5 9.4 8.5 13.6a8.5 8.5 0 0 1-17 0C3.5 10.9 7.4 6.7 12 1.5Z';

/** The YamanAI mark: rings of ink pulled to a point by a single tine stroke. */
export const LogoMark = memo(({ size = 32, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={`flex-shrink-0 ${className}`}>
    {/* Renkler tasarima gore: Ebru'da kok boya, Gece Bogaz'inda altin ve sis mavisi (globals.css) */}
    <path d={TEAR} style={{ fill: 'var(--y-logo-1, #C8452F)' }} />
    <path d={TEAR} style={{ fill: 'var(--y-logo-2, #F4F1EA)' }} transform="translate(12 16) scale(.72) translate(-12 -16)" />
    <path d={TEAR} style={{ fill: 'var(--y-logo-3, #D9A441)' }} transform="translate(12 16) scale(.5) translate(-12 -16)" />
    <path d={TEAR} style={{ fill: 'var(--y-logo-4, #101B3D)' }} transform="translate(12 16) scale(.26) translate(-12 -16)" />
  </svg>
));
LogoMark.displayName = 'LogoMark';

const SWATCH_INKS = ['#101B3D', '#C8452F', '#D9A441', '#2F7F86'];
const swatches = new Map<string, string>();

/** A small round crop of ink unique to the chat, so chats can be told apart at a glance. */
export const ChatMark = memo(({ id, size = 20 }: { id: string; size?: number }) => {
  // Sohbet listesi yalnizca istemcide dolar, yani kanvas burada her zaman vardir
  const src = useMemo(() => {
    if (typeof document === 'undefined') return '';
    let url = swatches.get(id);
    if (!url) {
      url = chatSwatch(id, size * 2, SWATCH_INKS, '#F4F1EA');
      swatches.set(id, url);
    }
    return url;
  }, [id, size]);
  return (
    <span aria-hidden="true" className="block flex-shrink-0 rounded-full bg-[#F4F1EA] bg-cover" style={{ width: size, height: size, backgroundImage: src ? `url(${src})` : undefined }} />
  );
});
ChatMark.displayName = 'ChatMark';
