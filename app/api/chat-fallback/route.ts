import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_PROMPT_LENGTH = 20_000;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return jsonError('GEMINI_API_KEY is not configured.', 503);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError('Request body must be valid JSON.', 400);
  }

  const prompt =
    typeof body === 'object' && body !== null && 'prompt' in body
      ? (body as { prompt?: unknown }).prompt
      : undefined;

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return jsonError('Prompt is required.', 400);
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return jsonError(`Prompt exceeds the ${MAX_PROMPT_LENGTH}-character limit.`, 413);
  }

  try {
    const result = streamText({
      model: google(GEMINI_MODEL),
      prompt,
    });

    // The browser adapter consumes a plain UTF-8 text stream, not an AI SDK
    // UI/data stream, so use the text-stream response helper here.
    return result.toTextStreamResponse({
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('AI SDK streaming error:', error);
    return jsonError('Failed to generate response.', 500);
  }
}
