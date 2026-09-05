import assert from 'node:assert/strict';
import {
  DEFAULT_WEBLLM_MODEL,
  SmartLanguageSession,
  createLocalSession,
  createSmartSession,
  createWebLLMSession,
  getAvailability,
  isSupported,
  isWebLLMSupported,
  normalizeStream,
  promptToText,
} from '../in-built/builtin-ai.mjs';

function fakeGlobal() {
  const events = [];
  let createOptions = null;
  const session = {
    async *promptStreaming(prompt, options) {
      assert.equal(options.responseConstraint.type, 'object');
      assert.equal(options.signal.aborted, false);
      yield 'Answer:';
      yield `Answer: ${prompt}`;
    },
    async append(messages) {
      assert.equal(messages[0].role, 'user');
    },
    async clone() {
      return { async *promptStreaming() { yield 'clone'; } };
    },
    destroy() { session.destroyed = true; },
    destroyed: false,
  };

  return {
    events,
    get createOptions() { return createOptions; },
    LanguageModel: {
      async availability(options) {
        assert.deepEqual(options.expectedInputs, [{ type: 'text', languages: ['en'] }]);
        assert.deepEqual(options.expectedOutputs, [{ type: 'text', languages: ['en'] }]);
        return 'downloadable';
      },
      async create(options) {
        createOptions = options;
        options.monitor({
          addEventListener(_name, callback) {
            events.push(callback);
          },
        });
        const callback = events[0];
        for (const loaded of [0.25, 1]) callback?.({ loaded });
        return session;
      },
    },
  };
}

const fake = fakeGlobal();
assert.equal(isSupported(fake), true);
assert.equal(await getAvailability(undefined, fake), 'downloadable');

let lastProgress = null;
const controller = new AbortController();
const local = await createLocalSession({
  globalObject: fake,
  signal: controller.signal,
  onProgress: (progress) => { lastProgress = progress; },
});

assert.equal(fake.createOptions.signal, controller.signal);
assert.equal(lastProgress.complete, true);
assert.equal(lastProgress.extracting, true);
assert.equal(await promptToText(local, 'test', undefined, {
  responseConstraint: { type: 'object' },
  signal: controller.signal,
}), 'Answer: test');
await local.append([{ role: 'user', content: 'context' }]);

const unsupported = { fetch: async () => { throw new Error('fetch should not run'); } };
assert.equal(isSupported(unsupported), false);
assert.equal(isWebLLMSupported(unsupported), false);
let fallbackStatus = null;
const cloud = await createSmartSession({
  globalObject: unsupported,
  fallbackEndpoint: '/api/generate',
  fetchImpl: async (url, init) => {
    assert.equal(url, '/api/generate');
    assert.equal(init.method, 'POST');
    assert.deepEqual(JSON.parse(init.body), { prompt: 'hello' });
    return new Response('cloud answer', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  },
  onStatus: (status) => { fallbackStatus = status; },
});
assert.ok(cloud instanceof SmartLanguageSession);
assert.equal(cloud.nativeSession, null);
assert.equal(cloud.webllmSession, null);
assert.equal(fallbackStatus.source, 'cloud');
assert.equal(await cloud.promptToText('hello'), 'cloud answer');

const nativeSmart = await createSmartSession({
  globalObject: fake,
  fetchImpl: async () => { throw new Error('native should be preferred'); },
});
assert.ok(nativeSmart.nativeSession);
assert.equal(nativeSmart.source, 'native');
assert.equal(await nativeSmart.promptToText('native', undefined, { responseConstraint: { type: 'object' } }), 'Answer: native');

const failingNative = {
  LanguageModel: {
    async availability() { return 'available'; },
    async create() { throw new Error('native initialization failed'); },
  },
  navigator: {},
};
const recovered = await createSmartSession({
  globalObject: failingNative,
  preferWebLLM: false,
  fetchImpl: async () => new Response('recovered cloud answer', { status: 200 }),
});
assert.equal(recovered.nativeSession, null);
assert.equal(await recovered.promptToText('recover'), 'recovered cloud answer');

let webllmProgress = null;
let unloadCalled = false;
const fakeWebGPU = { navigator: { gpu: {} } };
const fakeEngine = {
  chat: {
    completions: {
      async *create({ messages, stream }) {
        assert.equal(messages[0].content, 'webllm');
        assert.equal(stream, true);
        yield { choices: [{ delta: { content: 'local ' } }] };
        yield { choices: [{ delta: { content: 'answer' } }] };
      },
    },
  },
  async unload() { unloadCalled = true; },
};
const webllm = await createWebLLMSession({
  globalObject: fakeWebGPU,
  model: DEFAULT_WEBLLM_MODEL,
  webllmModule: {
    async CreateMLCEngine(model, options) {
      assert.equal(model, DEFAULT_WEBLLM_MODEL);
      options.initProgressCallback({ progress: 0.5 });
      options.initProgressCallback({ progress: 1 });
      return fakeEngine;
    },
  },
  onProgress: (progress) => { webllmProgress = progress; },
});
assert.equal(webllmProgress.complete, true);
assert.equal(await new SmartLanguageSession(null, '/unused', null, webllm).promptToText('webllm'), 'local answer');

const webllmSelected = await createSmartSession({
  globalObject: fakeWebGPU,
  preferWebLLM: true,
  fetchImpl: async () => { throw new Error('cloud should not run'); },
  webllmModule: {
    async CreateMLCEngine() { return fakeEngine; },
  },
});
assert.equal(webllmSelected.source, 'webllm');
assert.equal(await webllmSelected.promptToText('webllm'), 'local answer');
await webllmSelected.destroy();
assert.equal(unloadCalled, true);

const cumulative = await normalizeStream((async function* () {
  yield 'A';
  yield 'AB';
  yield 'ABC';
})());
const normalized = [];
for await (const chunk of cumulative) normalized.push(chunk);
assert.deepEqual(normalized, ['A', 'B', 'C']);

const delta = await normalizeStream((async function* () {
  yield 'A';
  yield 'B';
  yield 'C';
})());
const normalizedDelta = [];
for await (const chunk of delta) normalizedDelta.push(chunk);
assert.deepEqual(normalizedDelta, ['A', 'B', 'C']);

const cloneSource = new SmartLanguageSession(local);
const clone = await cloneSource.clone();
assert.equal(await clone.promptToText('ignored'), 'clone');
cloneSource.addEventListener('contextoverflow', () => {});
cloneSource.destroy();
assert.equal(local.destroyed, true);

console.log('builtin-ai verification: PASS');
