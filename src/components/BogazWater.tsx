"use client";

import { memo, useEffect, useRef } from 'react';

// Gece Bogaz'i tasariminin imzasi: yazi kutusunun arkasindaki gece suyu.
// Karsi kiyida yanan her isik suya uzun bir yansima birakir. Her sohbetin isiklari
// kendi kimliginden turetilir ve her tamamlanan yanit bir isik daha yakar.
// Su yalnizca yanit akarken kipirdar; hareket azaltildiysa hep durgundur.

const GOLD = [232, 182, 90];
const MIST = [159, 179, 217];
const MAX_LIGHTS = 12;

type Light = { x: number; w: number; glow: number; tone: number[]; phase: number; speed: number };

/** Kucuk, tekrarlanabilir rastgele sayi uretici (mulberry32) */
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6D2B79F5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sohbetin isiklari: ilk ucu her zaman yanar, sonrakiler yanit basina bir tane */
function lightsFor(seed: string, count: number): Light[] {
  const r = rng(seed);
  // Isiklar kiyiya esit dagilir: genislik dilimlere bolunur, siralari sohbete gore karisir.
  // Boylece hepsi yazi kutusunun arkasinda toplanmaz.
  const slots = Array.from({ length: MAX_LIGHTS }, (_, i) => i);
  for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
  const all: Light[] = [];
  for (let i = 0; i < MAX_LIGHTS; i++) {
    const near = r() < 0.75;
    all.push({
      x: (slots[i] + 0.2 + r() * 0.6) / MAX_LIGHTS,
      w: near ? 34 + r() * 40 : 14 + r() * 16,
      glow: near ? 0.55 + r() * 0.4 : 0.25 + r() * 0.2,
      tone: near ? GOLD : MIST,
      phase: r() * Math.PI * 2,
      speed: 0.6 + r() * 0.9,
    });
  }
  return all.slice(0, Math.min(3 + count, MAX_LIGHTS));
}

const BogazWater = memo(({ seed, settled, streaming, className = '' }: {
  seed: string; settled: number; streaming: boolean; className?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<(t: number, fresh: number) => void>(() => {});
  const rafRef = useRef(0);
  const lights = useRef<Light[]>([]);

  // Ciz: t zamaninda su yuzeyi. fresh 0..1, en yeni isigin yanma orani
  useEffect(() => {
    // Telefonda kutunun iki yaninda da isik kalsin diye en az alti isik
    const base = settled + (streaming ? 1 : 0);
    lights.current = lightsFor(seed, canvasRef.current && canvasRef.current.clientWidth < 640 ? Math.max(base, 3) : base);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    drawRef.current = (t, fresh) => {
      const { width: W, height: H } = canvas;
      const dpr = canvas.width / Math.max(canvas.clientWidth, 1);
      ctx.clearRect(0, 0, W, H);
      // Karsi kiyi cizgisi: bandin ust kismindaki ufuk
      // Dar ekranda yazi kutusu neredeyse tum genisligi kaplar: ufuk yukari alinir ki yansima kutunun ustunde gorunsun
      const narrow = canvas.clientWidth < 640;
      const horizon = Math.round(H * (narrow ? 0.06 : 0.18));
      ctx.fillStyle = 'rgba(42, 57, 100, 0.45)';
      ctx.fillRect(0, horizon, W, Math.max(1, Math.round(dpr)));
      const rowGap = 12 * dpr;
      const list = lights.current;
      list.forEach((l, i) => {
        const isNew = streaming && i === list.length - 1;
        const strength = l.glow * (isNew ? fresh : 1);
        if (strength <= 0.01) return;
        const cx = l.x * W;
        // Suyun uzerinde isigin yumusak parlamasi
        const halo = ctx.createRadialGradient(cx, horizon + (H - horizon) * 0.35, 0, cx, horizon + (H - horizon) * 0.35, l.w * dpr * 1.6);
        halo.addColorStop(0, `rgba(${l.tone.join(',')}, ${(strength * 0.12).toFixed(3)})`);
        halo.addColorStop(1, `rgba(${l.tone.join(',')}, 0)`);
        ctx.fillStyle = halo;
        ctx.fillRect(cx - l.w * dpr * 1.6, horizon, l.w * dpr * 3.2, H - horizon);
        // Isigin kaynagi: kiyidaki kucuk parlak nokta
        ctx.fillStyle = `rgba(${l.tone.join(',')}, ${Math.min(1, strength + 0.2)})`;
        ctx.beginPath();
        ctx.arc(cx, horizon - 3 * dpr, 1.8 * dpr, 0, Math.PI * 2);
        ctx.fill();
        // Yansima: asagi indikce genisleyen, kirik yatay cizgiler
        let row = 0;
        for (let y = horizon + 6 * dpr; y < H; y += rowGap, row++) {
          const depth = (y - horizon) / (H - horizon);
          const wave = Math.sin(row * 1.7 + l.phase + t * l.speed * 2.2);
          const len = l.w * dpr * (0.45 + depth * 1.1) * (0.65 + 0.35 * wave);
          const drift = Math.sin(row * 0.9 + l.phase + t * l.speed) * 3 * dpr * depth;
          const alpha = strength * (1 - depth * 0.55) * (0.55 + 0.45 * Math.abs(wave));
          if (alpha < 0.03 || len < 1) continue;
          ctx.strokeStyle = `rgba(${l.tone.join(',')}, ${alpha.toFixed(3)})`;
          ctx.lineWidth = (2.2 + depth * 2) * dpr;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(cx - len / 2 + drift, y);
          ctx.lineTo(cx + len / 2 + drift, y);
          ctx.stroke();
        }
      });
    };
    drawRef.current(0, 1);
  }, [seed, settled, streaming]);

  // Boyut degisince kanvasi ayarla
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(([entry]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(entry.contentRect.width * dpr);
      const h = Math.round(entry.contentRect.height * dpr);
      if (w && h && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w; canvas.height = h;
        drawRef.current(0, 1);
      }
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Yanit akarken su kipirdar ve yeni isik yavasca yanar; bitince durgun hale doner
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!streaming || reduced) { drawRef.current(0, 1); return; }
    const start = performance.now();
    let last = 0;
    const tick = (now: number) => {
      if (now - last > 33) { // ~30 kare yeter, pil dostu
        last = now;
        const t = (now - start) / 1000;
        drawRef.current(t, Math.min(1, t / 1.6));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [streaming, seed]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`y-water block size-full pointer-events-none ${className}`} />;
});
BogazWater.displayName = 'BogazWater';

export default BogazWater;
