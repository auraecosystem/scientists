import assert from 'node:assert/strict';
import { DEFAULT_FALLBACK_TOKEN_BUDGET, DEFAULT_WEBLLM_MODEL, MULTIMODAL_LANGUAGE_OPTIONS, SmartLanguageSession, applySlidingWindow, applyTokenSlidingWindow, countMessagePayloadTokens, createLocalSession, createSmartSession, createWebLLMSession, getAvailability, isAbortError, isSupported, isWebLLMSupported, mediaPartToBase64, normalizeStream, promptToText, serializeMultimodalMessages } from '../in-built/builtin-ai';

function fakeGlobal() {
  const events: Array<(event: { loaded: number }) => void> = [];
  let createOptions: any = null;
  const session: any = {
    async *promptStreaming(prompt: any, options: any = {}) {
      if (typeof prompt === 'string') { assert.equal(options.responseConstraint?.type, 'object'); assert.equal(options.signal?.aborted ?? false, false); yield 'Answer:'; yield `Answer: ${prompt}`; }
      else { assert.equal(prompt[0].role, 'user'); assert.equal(prompt[0].content[0].type, 'image'); yield 'multimodal answer'; }
    },
    async append(messages: any[]) { assert.equal(messages[0].role, 'user'); },
    async clone() { return { async *promptStreaming() { yield 'clone'; }, destroy() {} }; },
    destroy() { session.destroyed = true; }, destroyed: false,
    addEventListener() {}, removeEventListener() {}, contextUsage: 10, contextWindow: 100,
  };
  return { events, get createOptions() { return createOptions; }, LanguageModel: {
    async availability(options: any) { assert.deepEqual(options.expectedOutputs, [{ type: 'text', languages: ['en'] }]); assert.ok(options.expectedInputs?.length === 1 || options.expectedInputs?.length === 3); return 'downloadable'; },
    async create(options: any) { createOptions = options; options.monitor({ addEventListener(_name: string, callback: (event: { loaded: number }) => void) { events.push(callback); } }); events[0]?.({ loaded: .25 }); events[0]?.({ loaded: 1 }); return session; },
  } };
}

const fake = fakeGlobal();
assert.equal(isSupported(fake), true); assert.equal(await getAvailability(undefined, fake), 'downloadable');
let progress: any = null; const controller = new AbortController();
const local = await createLocalSession({ globalObject: fake, signal: controller.signal, options: MULTIMODAL_LANGUAGE_OPTIONS, onProgress: (value) => { progress = value; } });
assert.equal(fake.createOptions.signal, controller.signal); assert.equal(progress.complete, true); assert.equal(progress.extracting, true);
assert.equal(await promptToText(local, 'test', undefined, { responseConstraint: { type: 'object' }, signal: controller.signal }), 'Answer: test');
await local.append([{ role: 'user', content: 'context' }]); assert.equal(await promptToText(local, [{ role: 'user', content: [{ type: 'image', value: 'native' }] }]), 'multimodal answer');
const aborted = new AbortController(); aborted.abort(); await assert.rejects(() => createLocalSession({ globalObject: fake, signal: aborted.signal }), (error) => isAbortError(error));

const imageBytes = new Uint8Array([1, 2, 3, 4]); const imagePart = await mediaPartToBase64({ type: 'image', value: imageBytes.buffer, mimeType: 'image/png' });
assert.equal(imagePart.base64Data, 'AQIDBA=='); assert.equal(imagePart.mimeType, 'image/png');
const audioBlob = new Blob([new Uint8Array([5, 6, 7])], { type: 'audio/wav' }); const audioPart = await mediaPartToBase64({ type: 'audio', value: audioBlob });
assert.equal(audioPart.base64Data, 'BQYH'); assert.equal(audioPart.mimeType, 'audio/wav');
const serialized = await serializeMultimodalMessages([{ role: 'user', content: [{ type: 'text', value: 'describe' }, { type: 'image', value: imageBytes.buffer, mimeType: 'image/png' }, { type: 'audio', value: audioBlob }] }]);
assert.equal((serialized[0].content as any[])[1].base64Data, 'AQIDBA=='); assert.equal((serialized[0].content as any[])[2].base64Data, 'BQYH');

const unsupported = { fetch: async () => { throw new Error('fetch should not run'); } };
assert.equal(isSupported(unsupported), false); assert.equal(isWebLLMSupported(unsupported), false);
let fallbackStatus: any = null;
const cloud = await createSmartSession({ globalObject: unsupported, fetchImpl: async (url, init: any) => { assert.equal(url, '/api/chat'); const body = JSON.parse(init.body); assert.equal(body.messages.at(-1).content, 'hello'); return new Response('cloud answer', { status: 200 }); }, onStatus: (status) => { fallbackStatus = status; } });
assert.equal(cloud.source, 'cloud'); assert.equal(fallbackStatus.source, 'cloud'); assert.equal(await cloud.promptToText('hello'), 'cloud answer');
const multimodalCloud = await createSmartSession({ globalObject: unsupported, fetchImpl: async (_url, init: any) => { const body = JSON.parse(init.body); assert.equal(body.messages[0].content[1].type, 'image'); assert.equal(body.messages[0].content[2].type, 'audio'); return new Response('multimodal cloud answer', { status: 200 }); } });
assert.equal(await multimodalCloud.promptToText([{ role: 'user', content: [{ type: 'text', value: 'describe' }, { type: 'image', value: imageBytes.buffer, mimeType: 'image/png' }, { type: 'audio', value: audioBlob }] }]), 'multimodal cloud answer');
const systemCloud = await createSmartSession({ globalObject: unsupported, options: { systemPrompt: 'Persistent coding assistant', initialPrompts: [{ role: 'user', content: 'Remember this.' }, { role: 'assistant', content: 'Remembered.' }] }, fetchImpl: async (_url, init: any) => { const body = JSON.parse(init.body); assert.equal(body.messages[0].role, 'system'); assert.equal(body.messages[0].content, 'Persistent coding assistant'); assert.equal(body.messages[1].content, 'Remember this.'); return new Response('ok'); } });
assert.equal(await systemCloud.promptToText('next'), 'ok');
const windowed = applySlidingWindow([{ role: 'system', content: 'S' }, { role: 'user', content: '1' }, { role: 'assistant', content: '1a' }, { role: 'user', content: '2' }, { role: 'assistant', content: '2a' }, { role: 'user', content: '3' }], 2);
assert.deepEqual(windowed.map((m) => m.content), ['S', '2a', '3']);
const budgeted = await applyTokenSlidingWindow([{ role: 'system', content: 'S' }, { role: 'user', content: 'one '.repeat(100) }, { role: 'assistant', content: 'two '.repeat(100) }, { role: 'user', content: 'latest' }], DEFAULT_FALLBACK_TOKEN_BUDGET);
assert.equal(budgeted[0].role, 'system'); assert.equal(budgeted.at(-1)?.content, 'latest'); assert.ok((await countMessagePayloadTokens(budgeted)) <= DEFAULT_FALLBACK_TOKEN_BUDGET || budgeted.length === 2);

const nativeSmart = await createSmartSession({ globalObject: fake, fetchImpl: async () => { throw new Error('native should be preferred'); } });
assert.equal(nativeSmart.source, 'native'); assert.equal(await nativeSmart.promptToText('native', undefined, { responseConstraint: { type: 'object' } }), 'Answer: native'); assert.equal(nativeSmart.contextUsageRatio, .1);
const failingNative = { LanguageModel: { async availability() { return 'available'; }, async create() { throw new Error('native initialization failed'); } }, navigator: {} };
const recovered = await createSmartSession({ globalObject: failingNative, preferWebLLM: false, fetchImpl: async () => new Response('recovered') }); assert.equal(await recovered.promptToText('recover'), 'recovered');
let webProgress: any = null; let unload = false; const fakeGPU = { navigator: { gpu: {} } };
const engine: any = { chat: { completions: { async *create({ messages, stream }: any) { assert.equal(messages[0].content, 'webllm'); assert.equal(stream, true); yield { choices: [{ delta: { content: 'local ' } }] }; yield { choices: [{ delta: { content: 'answer' } }] }; } } }, async unload() { unload = true; } };
const webllm = await createWebLLMSession({ globalObject: fakeGPU, model: DEFAULT_WEBLLM_MODEL, webllmModule: { async CreateMLCEngine(model: string, options: any) { assert.equal(model, DEFAULT_WEBLLM_MODEL); options.initProgressCallback({ progress: .5 }); options.initProgressCallback({ progress: 1 }); return engine; } }, onProgress: (value) => { webProgress = value; } });
assert.equal(webProgress.complete, true); assert.equal(await new SmartLanguageSession(null, '/unused', null, webllm).promptToText('webllm'), 'local answer');
const selected = await createSmartSession({ globalObject: fakeGPU, webllmModule: { async CreateMLCEngine() { return engine; } }, fetchImpl: async () => { throw new Error('cloud should not run'); } });
assert.equal(selected.source, 'webllm'); assert.equal(await selected.promptToText('webllm'), 'local answer'); await selected.destroy(); assert.equal(unload, true);
const cumulative = normalizeStream((async function* () { yield 'A'; yield 'AB'; yield 'ABC'; })()); const chunks: string[] = []; for await (const chunk of cumulative) chunks.push(chunk); assert.deepEqual(chunks, ['A', 'B', 'C']);
assert.deepEqual(MULTIMODAL_LANGUAGE_OPTIONS.expectedInputs, [{ type: 'text', languages: ['en'] }, { type: 'image' }, { type: 'audio' }]);
const cloneSource = new SmartLanguageSession(local); const clone = await cloneSource.clone(); assert.equal(await clone.promptToText('ignored'), 'clone'); await cloneSource.destroy(); assert.equal((local as any).destroyed, true);
console.log('builtin-ai TypeScript verification: PASS');
