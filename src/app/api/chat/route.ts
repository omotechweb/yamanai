import { NextRequest } from 'next/server';

export const runtime = 'edge';

const DEFAULT_SYSTEM_PROMPT = `Sen profesyonel bir teknoloji uzmani ve yazilimcisin.
KURALLAR:
1. Turkce dil bilgisi kurallarina kusursuz uy.
2. Karakter atlama yapma.
3. Kod bloklarini backtick isaretleri ile eksiksiz ac ve kapat.
4. Python'da 'BeautifulSoup' kullanirken 'from bs4 import' kalibini kullan.`;

const ALLOWED_MODELS = new Set(['gpt-4o', 'gpt-4o-mini']);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, model: requestedModel, customSystemPrompt } = body;
  const apiKey = process.env.OPENAI_API_KEY;

  // Validate model - fallback to gpt-4o if invalid
  const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : 'gpt-4o';

  // Build system prompt
  const systemContent = customSystemPrompt
    ? `${DEFAULT_SYSTEM_PROMPT}\n\nEK TALIMATLAR:\n${customSystemPrompt}`
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
  });

  if (!openaiRes.ok || !openaiRes.body) {
    const errText = await openaiRes.text().catch(() => 'OpenAI request failed.');
    return new Response(
      `data: ${JSON.stringify({ delta: `API error: ${errText.slice(0, 200)}` })}\n\n`,
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
    );
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
    },
  });
}