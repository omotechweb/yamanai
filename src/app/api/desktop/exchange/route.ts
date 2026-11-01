import { NextRequest, NextResponse } from 'next/server';
import { decode, encode } from 'next-auth/jwt';
import {
  HANDOFF_SALT,
  SESSION_MAX_AGE,
  challengeFor,
  sessionCookieName,
  usesSecureCookie,
} from '@/lib/desktopAuth';

async function readHandoff(token: string, secret: string) {
  try {
    return await decode({ token, secret, salt: HANDOFF_SALT });
  } catch {
    return null; // bozuk ya da suresi dolmus belirtec
  }
}

// Masaustu uygulamasi cagirir: aktarim belirtecini kendi penceresinde oturum cerezine cevirir.
export async function GET(req: NextRequest) {
  const failed = () => NextResponse.redirect(new URL('/giris?error=Default', req.url));

  const token = req.nextUrl.searchParams.get('token');
  const verifier = req.nextUrl.searchParams.get('verifier');
  if (!token || !verifier) return failed();

  const secret = process.env.NEXTAUTH_SECRET!;
  const handoff = await readHandoff(token, secret);
  if (!handoff || handoff.challenge !== challengeFor(verifier)) return failed();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- sure ve kimlik alanlari yeni oturumda yeniden uretilir
  const { challenge, iat, exp, jti, ...claims } = handoff;
  const session = await encode({ token: claims, secret, maxAge: SESSION_MAX_AGE });

  const res = NextResponse.redirect(new URL('/', req.url));
  res.cookies.set(sessionCookieName(req), session, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: usesSecureCookie(req),
    maxAge: SESSION_MAX_AGE,
  });
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}
