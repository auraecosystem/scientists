import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_FALLBACK_TOKEN_BUDGET, MULTIMODAL_LANGUAGE_OPTIONS, SmartLanguageSession, applySlidingWindow, createLocalSession, createSmartSession, mediaPartToBase64, normalizeStream } from '../in-built/builtin-ai';

test('native session supports multimodal options', async () => {
  const session = { async *promptStreaming(input: unknown) { yield typeof input === 'string' ? 'ok' : 'multimodal'; }, destroy() {}, addEventListener() {}, removeEventListener() {} };
  const globalObject = { LanguageModel: { async availability(options: any) { assert.equal(options.expectedInputs.length, 3); return 'available'; }, async create() { return session; } } };
  const local = await createLocalSession({ globalObject, options: MULTIMODAL_LANGUAGE_OPTIONS });
  const reader = local.promptStreaming('hello').getReader();
  assert.equal((await reader.read()).value, 'ok');
});

test('media is serialized to JSON-safe base64', async () => {
  const part = await mediaPartToBase64({ type: 'image', value: new Uint8Array([1, 2, 3, 4]).buffer, mimeType: 'image/png' });
  assert.equal(part.base64Data, 'AQIDBA==');
  assert.equal(part.mimeType, 'image/png');
});

test('provider selection reaches cloud fallback when local providers are unavailable', async () => {
  const session = await createSmartSession({ globalObject: {}, fetchImpl: async (_url, init: any) => { const body = JSON.parse(init.body); assert.equal(body.messages.at(-1).content, 'hello'); return new Response('answer'); } });
  assert.equal(session.source, 'cloud');
  assert.equal(await session.promptToText('hello'), 'answer');
});

test('sliding window preserves system prompt and newest turns', () => {
  const result = applySlidingWindow([{ role: 'system', content: 'S' }, { role: 'user', content: '1' }, { role: 'assistant', content: '1a' }, { role: 'user', content: '2' }], 2);
  assert.deepEqual(result.map((m) => m.content), ['S', '1a', '2']);
});

test('destroy is idempotent and prevents reuse', async () => {
  const session = new SmartLanguageSession(null, '/api/chat', async () => new Response('ok'));
  assert.ok(DEFAULT_FALLBACK_TOKEN_BUDGET > 0);
  await session.destroy();
  await session.destroy();
  await assert.rejects(() => session.promptToText('again'), /destroyed/);
});

test('stream normalization removes cumulative prefixes', async () => {
  async function* source() { yield 'A'; yield 'AB'; yield 'ABC'; }
  const result: string[] = [];
  for await (const chunk of normalizeStream(source())) result.push(chunk);
  assert.deepEqual(result, ['A', 'B', 'C']);
});
