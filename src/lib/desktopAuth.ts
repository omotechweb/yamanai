import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';

// Google gomulu pencerelerde girise izin vermedigi icin masaustu uygulamasi girisi
// kullanicinin kendi tarayicisinda yapar. Oturum, uygulamaya su adimlarla aktarilir:
//   1. Uygulama rastgele bir "verifier" uretir, tarayiciya yalnizca ozetini (challenge) verir.
//   2. Giris bitince /api/desktop/complete kisa omurlu bir aktarim belirteci uretir ve
//      onu bilgisayarin kendi uzerindeki gecici adrese (127.0.0.1) gonderir.
//   3. Uygulama belirteci verifier ile /api/desktop/exchange'e goturur, oturum cerezini alir.
export const HANDOFF_SALT = 'yamanai.desktop-handoff';
export const HANDOFF_MAX_AGE = 120;
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export function isValidPort(port: string | null): port is string {
  return port !== null && /^\d{4,5}$/.test(port) && Number(port) >= 1024 && Number(port) <= 65535;
}

export function isValidChallenge(challenge: string | null): challenge is string {
  return challenge !== null && /^[A-Za-z0-9_-]{43}$/.test(challenge);
}

export function challengeFor(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url');
}

// next-auth'un kendi cerez secimiyle ayni kural: HTTPS'te __Secure- onekli cerez
export function usesSecureCookie(req: NextRequest) {
  return req.nextUrl.protocol === 'https:' || !!process.env.VERCEL;
}

export function sessionCookieName(req: NextRequest) {
  return usesSecureCookie(req) ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
}
