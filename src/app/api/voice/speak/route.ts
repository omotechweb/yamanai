import { NextRequest } from 'next/server';
import { authorizeVoice, voiceFail } from '@/lib/voice';

const MAX_TEXT_CHARS = 1_000; // istemci yaniti cumle cumle gonderir

export async function POST(req: NextRequest) {
  const auth = await authorizeVoice(req);
  if (auth.denied) return auth.denied;

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text || text.length > MAX_TEXT_CHARS) {
    await auth.giveBack();
    return voiceFail('invalid_request', 400);
  }

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'coral',
      input: text,
      response_format: 'mp3',
      instructions: 'Speak naturally and warmly at a conversational pace, in the language of the text.',
    }),
    signal: req.signal,
  }).catch(() => null);

  if (!res?.ok || !res.body) {
    console.error('Speech failed:', res?.status);
    await auth.giveBack();
    return voiceFail('upstream_failed', 502);
  }
  return new Response(res.body, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } });
}
