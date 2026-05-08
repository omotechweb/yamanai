import { NextRequest } from 'next/server';

export const runtime = 'edge';

const SYSTEM_PROMPT = `Sen profesyonel bir teknoloji uzmani ve yazilimcisin. 
KURALLAR:
1. Turkce dil bilgisi kurallarina kusursuz uy. Kelimeleri asla birlesik yazma.
2. Karakter atlama yapma.
3. Kod bloklarini backtick isaretleri ile eksiksiz ac ve kapat.
4. Python'da 'BeautifulSoup' kullanirken 'from bs4 import' kalibini kullan.`;

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const apiKey = process.env.OPENAI_API_KEY;

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
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

      // Buffer holds incomplete SSE lines across TCP chunk boundaries.
      // Without this, a line split across two chunks causes JSON.parse to fail
      // and that token is silently dropped, causing missing characters.
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
          // Incomplete JSON line — buffer logic should prevent this,
          // but if it happens we skip rather than corrupt the output.
        }
        return false;
      };

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // Flush decoder for any remaining multi-byte UTF-8 chars
            buffer += decoder.decode();
            if (buffer.trim()) processLine(buffer);
            break;
          }

          // stream:true prevents splitting multi-byte UTF-8 chars across chunks
          buffer += decoder.decode(value, { stream: true });

          // Process only complete lines (ending with \n).
          // Incomplete last line stays in buffer and merges with next chunk.
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