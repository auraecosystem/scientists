import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent`;
const MAX_PROMPT_LENGTH = 20_000;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return jsonError('GEMINI_API_KEY is not configured.', 503);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError('Request body must be valid JSON.', 400);
  }

  const prompt = typeof body === 'object' && body !== null && 'prompt' in body
    ? (body as { prompt?: unknown }).prompt
    : undefined;

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return jsonError('Prompt is required.', 400);
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return jsonError(`Prompt exceeds the ${MAX_PROMPT_LENGTH}-character limit.`, 413);
  }

  try {
    const providerResponse = await fetch(`${GEMINI_API_URL}?alt=sse&key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
      cache: 'no-store',
    });

    if (!providerResponse.ok) {
      const detail = await providerResponse.text();
      console.error('Gemini streaming request failed:', providerResponse.status, detail.slice(0, 1000));
      return jsonError('Upstream language model request failed.', 502);
    }

    if (!providerResponse.body) {
      return jsonError('Upstream language model returned no response body.', 502);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const upstream = providerResponse.body.getReader();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await upstream.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data:')) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === '[DONE]') continue;

              try {
                const parsed = JSON.parse(payload) as {
                  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
                };
                const text = parsed.candidates?.[0]?.content?.parts
                  ?.map((part) => part.text ?? '')
                  .join('') ?? '';
                if (text) controller.enqueue(encoder.encode(text));
              } catch {
                // Ignore incomplete/non-JSON SSE frames; complete frames are processed above.
              }
            }
          }

          buffer += decoder.decode();
          if (buffer.startsWith('data:')) {
            const payload = buffer.slice(5).trim();
            if (payload && payload !== '[DONE]') {
              try {
                const parsed = JSON.parse(payload) as {
                  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
                };
                const text = parsed.candidates?.[0]?.content?.parts
                  ?.map((part) => part.text ?? '')
                  .join('') ?? '';
                if (text) controller.enqueue(encoder.encode(text));
              } catch {
                // Ignore an incomplete terminal frame.
              }
            }
          }
          controller.close();
        } catch (error) {
          console.error('Gemini stream forwarding failed:', error);
          controller.error(error);
        } finally {
          upstream.releaseLock();
        }
      },
      async cancel() {
        await upstream.cancel();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Streaming error:', error);
    return jsonError('Failed to generate response.', 500);
  }
}
