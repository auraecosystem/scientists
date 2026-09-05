import { google } from '@ai-sdk/google';
import { convertToModelMessages, streamText } from 'ai';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_MESSAGES = 50;
const MAX_CONTENT_LENGTH = 20_000;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function validMessage(message: unknown): boolean {
  if (!message || typeof message !== 'object') return false;
  const candidate = message as { role?: unknown; content?: unknown; parts?: unknown };
  if (!['user', 'assistant'].includes(String(candidate.role))) return false;
  if (typeof candidate.content === 'string') {
    return candidate.content.trim().length > 0 && candidate.content.length <= MAX_CONTENT_LENGTH;
  }
  return Array.isArray(candidate.parts);
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

  const messages =
    typeof body === 'object' && body !== null && 'messages' in body
      ? (body as { messages?: unknown }).messages
      : undefined;

  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError('Messages array is required.', 400);
  }

  if (messages.length > MAX_MESSAGES) {
    return jsonError(`A maximum of ${MAX_MESSAGES} messages is allowed.`, 413);
  }

  if (!messages.every(validMessage)) {
    return jsonError('Messages must contain valid user or assistant content.', 400);
  }

  try {
    const modelMessages = await convertToModelMessages(messages);
    const result = streamText({
      model: google(GEMINI_MODEL),
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse({
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('AI SDK chat error:', error);
    return jsonError('Failed to generate response.', 500);
  }
}
