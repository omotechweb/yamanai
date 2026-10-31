import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { consume, guestDailyLimit, nextResetAt, peek, refund, userDailyLimit } from '@/lib/usage';

export const runtime = 'edge';

const GUEST_MODEL = 'gpt-4o-mini';

const DEFAULT_SYSTEM_PROMPT = `You are YamanAI, a friendly and knowledgeable assistant for people of every background.
RULES:
1. Reply in the language the user writes in, with flawless grammar and spelling. Never drop letters or diacritics.
2. Match your depth to the question: explain simply for everyday questions, and be precise for technical ones.
3. Open and close code blocks fully with backticks, and name the language.
4. In Python, import BeautifulSoup with 'from bs4 import BeautifulSoup'.`;

const ALLOWED_MODELS = new Set(['gpt-4o', 'gpt-4o-mini']);
const ALLOWED_ROLES  = new Set(['user', 'assistant']);

const MAX_MESSAGES     = 60;
const MAX_MESSAGE_CHARS = 32_000;
const MAX_SYSTEM_CHARS = 4_000;

// Her calisma ortami icin ayri tutulur: kaba bir fren, gercek bir kota degil.
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.resetAt < now) {
    if (hits.size > 5_000) hits.clear();
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

const fail = (code: string, status: number) =>
  new Response(JSON.stringify({ error: code }), { status, headers: { 'Content-Type': 'application/json' } });

function cleanMessages(raw: unknown) {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) return null;
  const messages: { role: string; content: string }[] = [];
  for (const m of raw) {
    if (!m || !ALLOWED_ROLES.has(m.role) || typeof m.content !== 'string') return null;
    if (!m.content.trim() || m.content.length > MAX_MESSAGE_CHARS) return null;
    messages.push({ role: m.role, content: m.content });
  }
  return messages;
}

const clientIp = (req: NextRequest) => req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';

/** Girisli kullanici hesabiyla, girissiz kullanici IP adresiyle sayilir. */
async function identify(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) return { id: `user:${token.provider ?? ''}:${token.accountId ?? token.sub}`, signedIn: true };
  } catch {
    // Gecersiz ya da cozulemeyen oturum girissiz sayilir
  }
  return { id: `guest:${clientIp(req)}`, signedIn: false };
}

const usageBody = (used: number, signedIn: boolean) => ({
  used,
  limit: signedIn ? userDailyLimit() : guestDailyLimit(),
  guestLimit: guestDailyLimit(),
  userLimit: userDailyLimit(),
  resetAt: nextResetAt(),
  signedIn,
});

export async function GET(req: NextRequest) {
  const { id, signedIn } = await identify(req);
  return new Response(JSON.stringify(usageBody(await peek(id), signedIn)), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fail('not_configured', 503);

  if (isRateLimited(clientIp(req))) return fail('rate_limited', 429);

  const body = await req.json().catch(() => null);
  const messages = cleanMessages(body?.messages);
  if (!messages) return fail('invalid_request', 400);

  const { id, signedIn } = await identify(req);
  const limit = signedIn ? userDailyLimit() : guestDailyLimit();
  const used = await consume(id);
  if (used > limit) {
    await refund(id);
    return new Response(JSON.stringify({ error: 'daily_limit', ...usageBody(limit, signedIn) }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // GPT-4o ve ozel talimat girisli kullanicilar icin: istemciye guvenmeden burada uygula
  const model = !signedIn ? GUEST_MODEL : ALLOWED_MODELS.has(body.model) ? body.model : 'gpt-4o';

  // Build system prompt
  const custom = signedIn && typeof body.customSystemPrompt === 'string' ? body.customSystemPrompt.slice(0, MAX_SYSTEM_CHARS) : '';
  const systemContent = custom
    ? `${DEFAULT_SYSTEM_PROMPT}\n\nADDITIONAL INSTRUCTIONS FROM THE USER:\n${custom}`
    : DEFAULT_SYSTEM_PROMPT;

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemContent }, ...messages],
      stream: true,
      max_tokens: 4000,
      temperature: 0,
    }),
    signal: req.signal,
  }).catch(() => null);

  if (!openaiRes?.ok || !openaiRes.body) {
    console.error('OpenAI request failed:', openaiRes?.status);
    await refund(id);
    return fail(openaiRes?.status === 429 ? 'rate_limited' : 'upstream_failed', 502);
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = openaiRes.body!.getReader();
      const decoder = new TextDecoder('utf-8', { fatal: false });
      let buffer = '';

      const processLine = (raw: string): boolean => {
        const line = raw.trim();
        if (!line) return false;
        if (!line.startsWith('data:')) return false;

        const payload = line.slice(5).trim();
        if (!payload) return false;
        if (payload === '[DONE]') return true;

        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
            );
          }
        } catch {
          // Incomplete JSON - buffer logic prevents this in normal flow
        }
        return false;
      };

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            buffer += decoder.decode();
            if (buffer.trim()) processLine(buffer);
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          let newlineIdx: number;
          while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newlineIdx);
            buffer = buffer.slice(newlineIdx + 1);
            const isDone = processLine(line);
            if (isDone) {
              controller.close();
              return;
            }
          }
        }
      } catch (err) {
        try { controller.error(err); } catch {}
        return;
      }

      controller.close();
    },

    cancel() {
      openaiRes.body?.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Usage-Used': String(used),
    },
  });
}
