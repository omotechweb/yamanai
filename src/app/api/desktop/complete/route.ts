import { NextRequest, NextResponse } from 'next/server';
import { encode, getToken } from 'next-auth/jwt';
import { HANDOFF_MAX_AGE, HANDOFF_SALT, isValidChallenge, isValidPort, usesSecureCookie } from '@/lib/desktopAuth';

// Tarayicida giris bittikten sonra cagrilir: oturumu uygulamaya tasiyacak belirteci uretir.
export async function GET(req: NextRequest) {
  const port = req.nextUrl.searchParams.get('port');
  const challenge = req.nextUrl.searchParams.get('challenge');
  if (!isValidPort(port) || !isValidChallenge(challenge)) {
    return new NextResponse('Bad request', { status: 400 });
  }

  const secret = process.env.NEXTAUTH_SECRET!;
  const session = await getToken({ req, secret, secureCookie: usesSecureCookie(req) });
  if (!session) return NextResponse.redirect(new URL('/giris', req.url));

  const token = await encode({
    token: { ...session, challenge },
    secret,
    salt: HANDOFF_SALT,
    maxAge: HANDOFF_MAX_AGE,
  });

  // Hedef sabit olarak bu bilgisayar: belirtec baska bir adrese gonderilemez
  const res = NextResponse.redirect(`http://127.0.0.1:${port}/callback?token=${encodeURIComponent(token)}`);
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}
