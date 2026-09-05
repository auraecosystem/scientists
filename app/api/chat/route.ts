import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_MESSAGES = 50;
const MAX_PARTS_PER_MESSAGE = 32;
const MAX_TEXT_LENGTH = 20_000;
const MAX_MEDIA_BASE64_LENGTH = 12_000_000;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validMediaPart(part: unknown): boolean {
  if (!isRecord(part) || !['text', 'image', 'audio'].includes(String(part.type))) return false;

  if (part.type === 'text') {
    const value = part.value;
    return typeof value === 'string' && value.length <= MAX_TEXT_LENGTH;
  }

  return typeof part.base64Data === 'string'
    && part.base64Data.length > 0
    && part.base64Data.length <= MAX_MEDIA_BASE64_LENGTH
    && (part.mimeType === undefined || typeof part.mimeType === 'string');
}

function toModelContent(content: unknown) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content) || content.length === 0 || content.length > MAX_PARTS_PER_MESSAGE) {
    throw new Error('Message content must be text or a non-empty array of multimodal parts.');
  }

  return content.map((part) => {
    if (!validMediaPart(part)) throw new Error('Invalid multimodal content part.');
    const candidate = part as { type: 'text' | 'image' | 'audio'; value?: string; base64Data?: string; mimeType?: string };

    if (candidate.type === 'text') return { type: 'text' as const, text: candidate.value ?? '' };

    const mimeType = candidate.mimeType || (candidate.type === 'image' ? 'image/png' : 'audio/wav');
    const dataUrl = `data:${mimeType};base64,${candidate.base64Data}`;

    if (candidate.type === 'image') {
      return { type: 'image' as const, image: dataUrl };
    }

    return { type: 'file' as const, data: dataUrl, mimeType };
  });
}

function toModelMessages(messages: unknown[]) {
  return messages.map((message) => {
    if (!isRecord(message) || !['user', 'assistant', 'system'].includes(String(message.role))) {
      throw new Error('Message role must be user, assistant, or system.');
    }
    if (message.role === 'system' && Array.isArray(message.content)) {
      throw new Error('System messages must use text content.');
    }

    const content = message.content;
    if (typeof content === 'string') {
      if (!content.trim() || content.length > MAX_TEXT_LENGTH) throw new Error('Invalid message text.');
      return { role: message.role as 'user' | 'assistant' | 'system', content };
    }

    if (message.role === 'system') throw new Error('System messages must use text content.');
    return { role: message.role as 'user' | 'assistant', content: toModelContent(content) };
  });
}

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) return jsonError('GEMINI_API_KEY is not configured.', 503);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError('Request body must be valid JSON.', 400);
  }

  const messages = isRecord(body) ? body.messages : undefined;
  if (!Array.isArray(messages) || messages.length === 0) return jsonError('Messages array is required.', 400);
  if (messages.length > MAX_MESSAGES) return jsonError(`A maximum of ${MAX_MESSAGES} messages is allowed.`, 413);

  try {
    const modelMessages = toModelMessages(messages);
    const result = streamText({
      model: google(GEMINI_MODEL),
      messages: modelMessages,
    });

    return result.toTextStreamResponse({
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid multimodal request.';
    console.error('AI SDK multimodal chat error:', error);
    return jsonError(message, 400);
  }
}
