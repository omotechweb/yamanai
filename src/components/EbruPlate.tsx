"use client";

import { memo, useEffect, useRef } from 'react';
import { buildPlate, flowerOps, streamRingOp, tineOp, type Plate } from '@/lib/ebru';

const INKS = {
  light: { inks: ['#101B3D', '#C8452F', '#D9A441', '#2F7F86'], ground: '#F4F1EA' },
  dark:  { inks: ['#3A4E93', '#C8452F', '#D9A441', '#2F7F86'], ground: '#0B1228' },
};

/**
 * The marbled band behind the composer. It records the chat: one flower of ink per
 * answer, one tine pull when the answer ends. It only moves while an answer streams.
 */
const EbruPlate = memo(({ seed, settled, streaming, theme, className = '' }: {
  seed: string; settled: number; streaming: boolean; theme: 'dark' | 'light'; className?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const plateRef  = useRef<Plate | null>(null);
  const builtRef  = useRef({ seed: '', settled: -1 });
  const paintRef  = useRef<() => void>(() => {});
  const rafRef    = useRef(0);
  const streamSeed = useRef<string | null>(null);
  const ringTimer  = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Tema degisince yalnizca yeniden boya
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { inks, ground } = INKS[theme];
    paintRef.current = () => plateRef.current?.paint(ctx, canvas.width, canvas.height, inks, ground);
    paintRef.current();
  }, [theme]);

  // Boyut degisince kanvasi ayarla
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(([entry]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.round(entry.contentRect.width * dpr);
      const h = Math.round(entry.contentRect.height * dpr);
      if (w && h && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w; canvas.height = h;
        paintRef.current();
      }
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Yanit akarken murekkep dokulur; bitince tarak cekilir.
  // Asagidaki yeniden kurma etkisinden once calismali: bitis sayaci burada ilerler.
  useEffect(() => {
    const started = streaming && streamSeed.current === null;
    const ended = !streaming && streamSeed.current !== null;
    if (!started && !ended) return;

    const runLoop = () => {
      cancelAnimationFrame(rafRef.current);
      const tick = (now: number) => {
        const more = plateRef.current?.step(now) ?? false;
        paintRef.current();
        if (more) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (started) {
      streamSeed.current = seed;
      if (!plateRef.current || builtRef.current.seed !== seed) {
        plateRef.current = buildPlate(seed, settled);
        builtRef.current = { seed, settled };
        paintRef.current();
      }
      const plate = plateRef.current;
      const ops = flowerOps(seed, settled, 1100);
      if (reduced) { ops.forEach(op => plate.commit(op)); paintRef.current(); }
      else {
        plate.enqueue(ops); runLoop();
        // Ilk cicek bitince, yanit surdukce kucuk halkalar dusmeye devam etsin
        let n = 0;
        ringTimer.current = setInterval(() => {
          if (plate.busy) return;
          plate.enqueue([streamRingOp(seed, settled * 1000 + n++, 900)]);
          runLoop();
        }, 500);
      }
      return;
    }

    clearInterval(ringTimer.current);
    const sameChat = streamSeed.current === seed;
    streamSeed.current = null;
    const plate = plateRef.current;
    if (!sameChat || !plate) return; // kullanici baska sohbete gecti: plaka yeniden kurulacak
    const unit = builtRef.current.settled;
    const op = tineOp(seed, unit, 800);
    builtRef.current = { seed, settled };
    if (reduced) { plate.flushAll(); plate.commit(op); paintRef.current(); }
    else { plate.hurry(220); plate.enqueue([op]); runLoop(); }
  }, [streaming, seed, settled]);

  // Sohbet degisince plakayi kaydindan yeniden kur
  useEffect(() => {
    if (streaming) return;
    const built = builtRef.current;
    if (built.seed === seed && built.settled === settled) return;
    cancelAnimationFrame(rafRef.current);
    plateRef.current = buildPlate(seed, settled);
    builtRef.current = { seed, settled };
    paintRef.current();
  }, [seed, settled, streaming]);

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); clearInterval(ringTimer.current); }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={`y-plate block size-full pointer-events-none ${className}`} />;
});
EbruPlate.displayName = 'EbruPlate';

export default EbruPlate;
