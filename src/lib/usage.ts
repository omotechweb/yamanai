// Gunluk mesaj limiti. Sayac sunucuda tutulur, cunku tarayicidaki bir sayac kolayca sifirlanir.
//
// UPSTASH_REDIS_REST_URL ve UPSTASH_REDIS_REST_TOKEN tanimliysa sayac Redis'te durur.
// Tanimli degilse bellekte durur: tek sunuculu kurulumda (next start, masaustu uygulamasi)
// yeterlidir, ama sunucusuz ortamda her ornek kendi sayacini tutar ve yeniden baslayinca sifirlanir.

const envLimit = (value: string | undefined, fallback: number) => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export const guestDailyLimit = () => envLimit(process.env.GUEST_DAILY_LIMIT, 10);
export const userDailyLimit = () => envLimit(process.env.USER_DAILY_LIMIT, 50);

const TTL_SECONDS = 2 * 24 * 60 * 60;

/** Gun UTC gece yarisinda degisir, boylece her yerde ayni ana denk gelir. */
const dayKey = (now = new Date()) => now.toISOString().slice(0, 10);

export function nextResetAt(now = new Date()) {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
}

// ─── Bellek deposu ───────────────────────────────────────────────────────────

let memoryDay = '';
const memory = new Map<string, number>();

function memoryAdd(id: string, delta: number) {
  const day = dayKey();
  if (day !== memoryDay) { memory.clear(); memoryDay = day; }
  const next = Math.max(0, (memory.get(id) ?? 0) + delta);
  memory.set(id, next);
  return next;
}

// ─── Redis deposu (Upstash REST) ─────────────────────────────────────────────

async function redis(commands: (string | number)[][]): Promise<{ result: unknown }[] | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// IP adresi depoya acik yazilmaz
async function hashId(id: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id));
  return [...new Uint8Array(bytes)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

const redisKey = async (id: string) => `yamanai:usage:${dayKey()}:${await hashId(id)}`;

// ─── Disariya acik islemler ──────────────────────────────────────────────────

/** Bir mesaj hakki harcar ve guncel sayiyi dondurur. */
export async function consume(id: string) {
  const key = await redisKey(id);
  const out = await redis([['INCR', key], ['EXPIRE', key, TTL_SECONDS]]);
  const value = Number(out?.[0]?.result);
  return out && Number.isFinite(value) ? value : memoryAdd(id, 1);
}

/** Yanit uretilemediyse harcanan hakki geri verir. */
export async function refund(id: string) {
  const out = await redis([['DECR', await redisKey(id)]]);
  if (!out) memoryAdd(id, -1);
}

export async function peek(id: string) {
  const out = await redis([['GET', await redisKey(id)]]);
  if (out) return Number(out[0]?.result ?? 0) || 0;
  return memoryAdd(id, 0);
}
