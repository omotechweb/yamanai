import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { consume, refund, voiceDailyLimit } from '@/lib/usage';

export const voiceFail = (code: string, status: number) =>
  Response.json({ error: code }, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * Sesli sohbet yalnizca girisli kullanicilar icindir ve her ses istegi gunluk hakdan duser,
 * cunku ses API'leri sohbet sayacinin disinda ayrica ucretlendirilir.
 */
export async function authorizeVoice(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { denied: voiceFail('not_configured', 503) };

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET }).catch(() => null);
  if (!token) return { denied: voiceFail('login_required', 401) };

  const id = `voice:${token.provider ?? ''}:${token.accountId ?? token.sub}`;
  if ((await consume(id)) > voiceDailyLimit()) {
    await refund(id);
    return { denied: voiceFail('voice_limit', 429) };
  }
  return { apiKey, giveBack: () => refund(id) };
}
