"use client";

import { memo, useEffect, useRef, useState } from 'react';
import { Mic, Square, X } from 'lucide-react';
import type { Strings } from '@/lib/i18n';
import { VoiceSession, type TurnResult, type VoiceError, type VoiceState } from '@/lib/voiceSession';

const NOTICE_MS = 5_000;

interface Props {
  audio: HTMLAudioElement;
  t: Strings;
  onTurn: (text: string, onDelta: (delta: string) => void) => Promise<TurnResult>;
  stopTurn: () => void;
  /** Sesli sohbet kapanir; `error` varsa nedeni gosterilir. */
  onEnd: (error?: VoiceError) => void;
}

// Yazi kutusunun yerine gecer, boylece konusma metni yukarida okunabilir kalir
export const VoiceBar = memo(({ audio, t, onTurn, stopTurn, onEnd }: Props) => {
  const [state, setState] = useState<VoiceState>('starting');
  const [notice, setNotice] = useState<VoiceError | null>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const sessionRef = useRef<VoiceSession | null>(null);

  // Oturum render'lar boyunca yasar: her zaman en guncel fonksiyonlari cagirsin
  const handlers = useRef({ onTurn, stopTurn, onEnd });
  useEffect(() => { handlers.current = { onTurn, stopTurn, onEnd }; });

  useEffect(() => {
    const session = new VoiceSession({
      audio,
      onState: setState,
      onLevel: level => {
        if (ringRef.current) ringRef.current.style.transform = `scale(${1 + level * 0.45})`;
      },
      onError: (code, fatal) => {
        if (fatal) handlers.current.onEnd(code);
        else setNotice(code);
      },
      onTurn: (text, onDelta) => handlers.current.onTurn(text, onDelta),
      stopTurn: () => handlers.current.stopTurn(),
    });
    sessionRef.current = session;
    void session.start();
    return () => session.stop();
  }, [audio]);

  useEffect(() => {
    if (!notice) return;
    const handle = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(handle);
  }, [notice]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handlers.current.onEnd(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const canInterrupt = state === 'transcribing' || state === 'thinking' || state === 'speaking';
  const live = state === 'listening' || state === 'hearing';

  return (
    <div className="flex items-center gap-3 min-h-[60px] pl-2 pr-2 py-2 bg-y-surface rounded-[28px] border border-y-line-strong">
      <span className="relative size-11 flex-shrink-0 flex items-center justify-center" aria-hidden="true">
        <span ref={ringRef} className={`absolute inset-0 rounded-full motion-reduce:!transform-none ${live ? 'bg-y-link/25' : 'bg-y-surface2'}`} />
        <Mic size={20} className={`relative ${live ? 'text-y-link' : 'text-y-muted'}`} />
      </span>

      <p role="status" className="flex-1 min-w-0 text-[15px] font-semibold leading-snug">
        {notice ? t.voiceErrors[notice] : t.voiceStates[state]}
      </p>

      {canInterrupt && (
        <button type="button" onClick={() => sessionRef.current?.interrupt()}
          className="min-h-11 px-4 inline-flex items-center gap-2 rounded-full border border-y-line-strong text-[15px] font-semibold hover:bg-y-surface2 transition-colors duration-150">
          <Square size={13} fill="currentColor" aria-hidden="true" /> {t.voiceInterrupt}
        </button>
      )}
      <button type="button" onClick={() => onEnd()} aria-label={t.voiceEnd} title={t.voiceEnd}
        className="y-hit size-11 flex-shrink-0 flex items-center justify-center rounded-full bg-y-bubble text-y-bubble-ink">
        <X size={18} />
      </button>
    </div>
  );
});
VoiceBar.displayName = 'VoiceBar';
