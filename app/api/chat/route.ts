import { google } from '@ai-sdk/google';
import { convertToModelMessages, streamText } from 'ai';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_MESSAGES = 50;
const MAX_PARTS_PER_MESSAGE = 32;
const MAX_TEXT_LENGTH = 20_000;
const MAX_MEDIA_BASE64_LENGTH = 12_000_000;
const MAX_TOTAL_MEDIA_BASE64_LENGTH = 24_000_000;
// Keep the raw body bounded before JSON parsing. The aggregate Base64 limit leaves
// room for JSON framing, roles, text, and MIME metadata.
const MAX_REQUEST_BYTES = 26_000_000;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

function jsonError(message: string, status: number) { return Response.json({ error: message }, { status }); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
function isUIMessage(value: unknown): boolean { return isRecord(value) && Array.isArray(value.parts) && !('content' in value); }
function validMime(value: unknown, kind: 'image' | 'audio') {
  return value === undefined || (typeof value === 'string' && value.length <= 128 && value.startsWith(`${kind}/`));
}
function validMediaPart(part: unknown): boolean {
  if (!isRecord(part) || !['text', 'image', 'audio'].includes(String(part.type))) return false;
  if (part.type === 'text') return typeof part.value === 'string' && part.value.length <= MAX_TEXT_LENGTH;
  return typeof part.base64Data === 'string' && part.base64Data.length > 0 && part.base64Data.length <= MAX_MEDIA_BASE64_LENGTH && /^[A-Za-z0-9+/]*={0,2}$/.test(part.base64Data) && validMime(part.mimeType, part.type as 'image' | 'audio');
}
function toModelContent(content: unknown) {
  if (typeof content === 'string') {
    if (!content.trim() || content.length > MAX_TEXT_LENGTH) throw new Error('Invalid message text.');
    return content;
  }
  if (!Array.isArray(content) || content.length === 0 || content.length > MAX_PARTS_PER_MESSAGE) throw new Error('Message content must be text or a non-empty array of multimodal parts.');
  return content.map((part) => {
    if (!validMediaPart(part)) throw new Error('Invalid multimodal content part.');
    const p = part as { type: 'text' | 'image' | 'audio'; value?: string; base64Data?: string; mimeType?: string };
    if (p.type === 'text') return { type: 'text' as const, text: p.value ?? '' };
    const mimeType = p.mimeType || (p.type === 'image' ? 'image/png' : 'audio/wav');
    const dataUrl = `data:${mimeType};base64,${p.base64Data}`;
    return p.type === 'image' ? { type: 'image' as const, image: dataUrl } : { type: 'file' as const, data: dataUrl, mimeType };
  });
}
function toModelMessages(messages: unknown[]) {
  let mediaTotal = 0;
  return messages.map((message) => {
    if (!isRecord(message) || !['user', 'assistant', 'system'].includes(String(message.role))) throw new Error('Message role must be user, assistant, or system.');
    const content = message.content;
    if (typeof content === 'string') {
      if (!content.trim() || content.length > MAX_TEXT_LENGTH) throw new Error('Invalid message text.');
      return { role: message.role as 'user' | 'assistant' | 'system', content };
    }
    if (message.role === 'system') throw new Error('System messages must use text content.');
    if (!Array.isArray(content)) throw new Error('Message content must be text or multimodal parts.');
    for (const part of content) if (isRecord(part) && typeof part.base64Data === 'string') mediaTotal += part.base64Data.length;
    if (mediaTotal > MAX_TOTAL_MEDIA_BASE64_LENGTH) throw new Error('Total multimodal payload exceeds the request limit.');
    return { role: message.role as 'user' | 'assistant', content: toModelContent(content) };
  });
}

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) return jsonError('GEMINI_API_KEY is not configured.', 503);

  const declaredLength = req.headers.get('content-length');
  if (declaredLength && Number.isFinite(Number(declaredLength)) && Number(declaredLength) > MAX_REQUEST_BYTES) {
    return jsonError('Request body exceeds the maximum allowed size.', 413);
  }

  let body: unknown;
  try {
    // Parse the bounded request text rather than calling req.json() directly. This
    // also protects chunked requests where Content-Length is unavailable.
    const rawBody = await req.text();
    const bodyBytes = new TextEncoder().encode(rawBody).byteLength;
    if (bodyBytes > MAX_REQUEST_BYTES) return jsonError('Request body exceeds the maximum allowed size.', 413);
    body = JSON.parse(rawBody);
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError('Request body must be valid JSON.', 400);
    return jsonError('Request body exceeds the maximum allowed size.', 413);
  }

  const messages = isRecord(body) ? body.messages : undefined;
  if (!Array.isArray(messages) || messages.length === 0) return jsonError('Messages array is required.', 400);
  if (messages.length > MAX_MESSAGES) return jsonError(`A maximum of ${MAX_MESSAGES} messages is allowed.`, 413);

  try {
    if (messages.every(isUIMessage)) {
      const modelMessages = await convertToModelMessages(messages);
      const result = streamText({ model: google(GEMINI_MODEL), messages: modelMessages });
      return result.toUIMessageStreamResponse({ headers: { 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' } });
    }

    const modelMessages = toModelMessages(messages);
    const systemMessages = modelMessages.filter((message) => message.role === 'system');
    const conversationMessages = modelMessages.filter((message) => message.role !== 'system');
    const system = systemMessages.map((message) => String(message.content)).join('\n\n');
    const result = streamText({ model: google(GEMINI_MODEL), ...(system ? { system } : {}), messages: conversationMessages });
    return result.toTextStreamResponse({ headers: { 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid multimodal request.';
    console.error('AI SDK chat error:', error);
    return jsonError(message, 400);
  }
}
