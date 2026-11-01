import { NextRequest } from 'next/server';
import { authorizeVoice, voiceFail } from '@/lib/voice';

const MAX_AUDIO_BYTES = 4 * 1024 * 1024; // Vercel istek govdesi siniri 4,5 MB
const EXTENSIONS: Record<string, string> = { 'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/ogg': 'ogg' };

export async function POST(req: NextRequest) {
  const auth = await authorizeVoice(req);
  if (auth.denied) return auth.denied;

  const form = await req.formData().catch(() => null);
  const audio = form?.get('audio');
  if (!(audio instanceof Blob) || audio.size === 0) {
    await auth.giveBack();
    return voiceFail('invalid_request', 400);
  }
  const extension = EXTENSIONS[audio.type.split(';')[0]];
  if (!extension || audio.size > MAX_AUDIO_BYTES) {
    await auth.giveBack();
    return voiceFail('invalid_request', 400);
  }

  const upstream = new FormData();
  upstream.set('model', 'gpt-4o-mini-transcribe');
  upstream.set('file', audio, `speech.${extension}`);

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.apiKey}` },
    body: upstream,
    signal: req.signal,
  }).catch(() => null);

  if (!res?.ok) {
    console.error('Transcription failed:', res?.status);
    await auth.giveBack();
    return voiceFail('upstream_failed', 502);
  }
  const data = await res.json().catch(() => null);
  return Response.json({ text: typeof data?.text === 'string' ? data.text.trim() : '' }, { headers: { 'Cache-Control': 'no-store' } });
}
