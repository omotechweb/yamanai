// Ebru (paper marbling) simulation.
//
// Ink on water is incompressible, so a new drop pushes every existing point
// outward while preserving area: P' = C + (P - C) * sqrt(1 + r^2 / |P - C|^2).
// Successive drops at one centre add their r^2, which lets a drop grow over many
// frames. A tine pull shears ink along a line, fading with distance from it.
// Each chat replays a script seeded from its id, so every chat has its own plate.

export const WORLD_W = 1600;
export const WORLD_H = 640;

const MAX_SHAPES = 130;
const MAX_POINTS = 420;
const MAX_SEGMENT = 11;

export type InkOp =
  | { kind: 'drop'; x: number; y: number; r: number; ink: number; ms: number }
  | { kind: 'tine'; x: number; y: number; ux: number; uy: number; z: number; ms: number };

interface Shape { ink: number; pts: number[] }

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The ink added by one answer: a flower of concentric rings. */
export function flowerOps(seed: string, unit: number, ringMs: number): InkOp[] {
  const r = rng(hash(`${seed}:${unit}`));
  const x = 60 + r() * (WORLD_W - 120);
  const y = 380 + r() * 230;
  const rings = 3 + Math.floor(r() * 3);
  const base = 44 + r() * 42;
  const start = Math.floor(r() * 4);
  const ops: InkOp[] = [];
  for (let i = 0; i < rings; i++) {
    // Her ikinci halka zemin rengi: halkalari ayiran su boslugu
    const ink = i % 2 === 1 ? 4 : (start + i) % 4;
    ops.push({ kind: 'drop', x, y, r: base * (1 - i * 0.16), ink, ms: ringMs });
  }
  return ops;
}

/** Battal, the traditional ground: many small drops that fill the whole band. */
function battalOps(seed: string): InkOp[] {
  const r = rng(hash(`${seed}:battal`));
  const columns = 22, rows = 3;
  const ops: InkOp[] = [];
  for (let c = 0; c < columns; c++) {
    for (let row = 0; row < rows; row++) {
      const x = ((c + r()) / columns) * WORLD_W;
      const y = 330 + ((row + r()) / rows) * 310;
      ops.push({ kind: 'drop', x, y, r: 30 + r() * 34, ink: r() < 0.14 ? 4 : Math.floor(r() * 4), ms: 0 });
    }
  }
  // Dagilim sirasi rastgele olsun, yoksa sutunlar soldan saga gorunur
  for (let i = ops.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [ops[i], ops[j]] = [ops[j], ops[i]];
  }
  return ops;
}

/** Gel-git: long combing strokes back and forth across the ground. */
function combOps(seed: string): InkOp[] {
  const r = rng(hash(`${seed}:comb`));
  const ops: InkOp[] = [];
  for (let i = 0; i < 4; i++) {
    const dir = i % 2 === 0 ? 1 : -1;
    const tilt = (r() - 0.5) * 0.12;
    ops.push({ kind: 'tine', x: WORLD_W / 2, y: 380 + i * 68 + r() * 30, ux: Math.cos(tilt) * dir, uy: Math.sin(tilt) * dir, z: 110 + r() * 80, ms: 0 });
  }
  return ops;
}

/** The comb stroke that closes an answer and feathers the rings. */
export function tineOp(seed: string, unit: number, ms: number): InkOp {
  const r = rng(hash(`${seed}:tine:${unit}`));
  const angle = (r() - 0.5) * 0.5;
  const dir = r() < 0.5 ? 1 : -1;
  return {
    kind: 'tine',
    x: r() * WORLD_W,
    y: 400 + r() * 200,
    ux: Math.cos(angle) * dir,
    uy: Math.sin(angle) * dir,
    z: 70 + r() * 90,
    ms,
  };
}

export class Plate {
  shapes: Shape[] = [];
  private active: { op: InkOp; shape?: Shape; done: number; start: number } | null = null;
  private queue: InkOp[] = [];

  get busy() { return !!this.active || this.queue.length > 0; }

  private displace(skip: Shape | undefined, x: number, y: number, r2: number) {
    for (const s of this.shapes) {
      if (s === skip) continue;
      const p = s.pts;
      for (let i = 0; i < p.length; i += 2) {
        const dx = p[i] - x, dy = p[i + 1] - y;
        const f = Math.sqrt(1 + r2 / Math.max(dx * dx + dy * dy, 1e-3));
        p[i] = x + dx * f;
        p[i + 1] = y + dy * f;
      }
    }
  }

  private shear(op: Extract<InkOp, { kind: 'tine' }>, amount: number) {
    const nx = -op.uy, ny = op.ux;
    const lambda = 46;
    for (const s of this.shapes) {
      const p = s.pts;
      for (let i = 0; i < p.length; i += 2) {
        const d = Math.abs((p[i] - op.x) * nx + (p[i + 1] - op.y) * ny);
        const m = amount * (lambda / (d + lambda));
        p[i] += op.ux * m;
        p[i + 1] += op.uy * m;
      }
    }
  }

  private static circle(x: number, y: number, r: number) {
    const n = Math.max(28, Math.ceil((2 * Math.PI * r) / MAX_SEGMENT));
    const pts: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    return pts;
  }

  // Gerilen kenarlara nokta ekle ki egriler koseli gorunmesin
  private resample() {
    for (const s of this.shapes) {
      if (s.pts.length / 2 >= MAX_POINTS) continue;
      const out: number[] = [];
      const p = s.pts;
      const n = p.length / 2;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const x = p[i * 2], y = p[i * 2 + 1], x2 = p[j * 2], y2 = p[j * 2 + 1];
        out.push(x, y);
        const d = Math.hypot(x2 - x, y2 - y);
        if (d > MAX_SEGMENT && out.length / 2 < MAX_POINTS) {
          const extra = Math.min(Math.floor(d / MAX_SEGMENT), 6);
          for (let k = 1; k <= extra; k++) {
            const t = k / (extra + 1);
            out.push(x + (x2 - x) * t, y + (y2 - y) * t);
          }
        }
      }
      s.pts = out;
    }
    if (this.shapes.length > MAX_SHAPES) this.shapes.splice(0, this.shapes.length - MAX_SHAPES);
  }

  /** Applies an op in full, with no animation. */
  commit(op: InkOp) {
    if (op.kind === 'drop') {
      this.displace(undefined, op.x, op.y, op.r * op.r);
      this.shapes.push({ ink: op.ink, pts: Plate.circle(op.x, op.y, op.r) });
    } else {
      this.shear(op, op.z);
    }
    this.resample();
  }

  enqueue(ops: InkOp[]) { this.queue.push(...ops); }

  /** Speeds up whatever is left so a short answer does not leave ink trailing. */
  hurry(ms: number) {
    for (const op of this.queue) op.ms = Math.min(op.ms, ms);
  }

  flushAll() {
    if (this.active) this.finishActive();
    for (const op of this.queue) this.commit(op);
    this.queue = [];
  }

  private finishActive() {
    const a = this.active;
    if (!a) return;
    if (a.op.kind === 'drop') {
      const r2 = a.op.r * a.op.r;
      this.displace(a.shape, a.op.x, a.op.y, r2 - a.done);
      a.shape!.pts = Plate.circle(a.op.x, a.op.y, a.op.r);
    } else {
      this.shear(a.op, a.op.z - a.done);
    }
    this.active = null;
    this.resample();
  }

  /** Advances the animation. Returns true while there is more to draw. */
  step(now: number) {
    if (!this.active) {
      const op = this.queue.shift();
      if (!op) return false;
      const shape = op.kind === 'drop' ? { ink: op.ink, pts: Plate.circle(op.x, op.y, 2) } : undefined;
      if (shape) this.shapes.push(shape);
      this.active = { op, shape, done: 0, start: now };
    }
    const a = this.active;
    const t = Math.min(1, (now - a.start) / Math.max(a.op.ms, 1));
    const eased = 1 - Math.pow(1 - t, 3);
    if (a.op.kind === 'drop') {
      const r2 = a.op.r * a.op.r * eased;
      this.displace(a.shape, a.op.x, a.op.y, r2 - a.done);
      a.done = r2;
      a.shape!.pts = Plate.circle(a.op.x, a.op.y, Math.max(Math.sqrt(r2), 2));
    } else {
      const z = a.op.z * eased;
      this.shear(a.op, z - a.done);
      a.done = z;
    }
    if (t >= 1) this.finishActive();
    return this.busy;
  }

  paint(ctx: CanvasRenderingContext2D, w: number, h: number, inks: string[], ground: string) {
    // Kare kanvas yukseklige gore olceklenir, boylece kirpinti dunyanin ortasindan alinir
    const s = Math.max(w / WORLD_W, h / WORLD_H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, w, h);
    ctx.setTransform(s, 0, 0, s, w / 2 - (WORLD_W / 2) * s, h - WORLD_H * s);
    for (const shape of this.shapes) {
      const p = shape.pts;
      const n = p.length / 2;
      if (n < 3) continue;
      ctx.fillStyle = inks[shape.ink] ?? ground;
      ctx.beginPath();
      ctx.moveTo((p[n * 2 - 2] + p[0]) / 2, (p[n * 2 - 1] + p[1]) / 2);
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        ctx.quadraticCurveTo(p[i * 2], p[i * 2 + 1], (p[i * 2] + p[j * 2]) / 2, (p[i * 2 + 1] + p[j * 2 + 1]) / 2);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
}

/** A small ring dropped for as long as an answer keeps streaming. */
export function streamRingOp(seed: string, n: number, ms: number): InkOp {
  const r = rng(hash(`${seed}:stream:${n}`));
  return { kind: 'drop', x: r() * WORLD_W, y: 420 + r() * 200, r: 22 + r() * 22, ink: Math.floor(r() * 4), ms };
}

/** A tiny crop of a chat's own ink, used as its mark in the history list. */
export function chatSwatch(seed: string, size: number, inks: string[], ground: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const plate = new Plate();
  const r = rng(hash(`${seed}:swatch`));
  for (let i = 0; i < 9; i++) {
    plate.commit({ kind: 'drop', x: 800 + (r() - 0.5) * 330, y: 320 + (r() - 0.5) * 330, r: 42 + r() * 60, ink: i % 4 === 3 ? 4 : Math.floor(r() * 4), ms: 0 });
  }
  const angle = r() * Math.PI;
  plate.commit({ kind: 'tine', x: 800, y: 320, ux: Math.cos(angle), uy: Math.sin(angle), z: 170, ms: 0 });
  plate.paint(ctx, size, size, inks, ground);
  return canvas.toDataURL();
}

/** Rebuilds a chat's plate from its finished answers. */
export function buildPlate(seed: string, settled: number) {
  const plate = new Plate();
  // Her sohbetin kendi zemini olur; sonra yalnizca son yanitlar tekrar oynatilir
  for (const op of battalOps(seed)) plate.commit(op);
  for (const op of combOps(seed)) plate.commit(op);
  for (let i = 0; i < 3; i++) {
    for (const op of flowerOps(seed, -1 - i, 0)) plate.commit(op);
    plate.commit(tineOp(seed, -1 - i, 0)); // kusursuz hedef tahtasi halkasi kalmasin
  }
  for (let u = Math.max(0, settled - 8); u < settled; u++) {
    for (const op of flowerOps(seed, u, 0)) plate.commit(op);
    plate.commit(tineOp(seed, u, 0));
  }
  return plate;
}
