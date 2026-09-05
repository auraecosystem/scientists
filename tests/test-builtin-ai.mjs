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
  promptToText,
} from '../in-built/builtin-ai.mjs';

function fakeGlobal() {
  const events = [];
  return {
    events,
    LanguageModel: {
      async availability(options) {
        assert.deepEqual(options.expectedInputs, [{ type: 'text', languages: ['en'] }]);
        assert.deepEqual(options.expectedOutputs, [{ type: 'text', languages: ['en'] }]);
        return 'downloadable';
      },
      async create({ monitor }) {
        monitor({
          addEventListener(_name, callback) {
            events.push(callback);
          },
        });
        const callback = events[0];
        for (const loaded of [0.25, 1]) callback?.({ loaded });
        return {
          async *promptStreaming(prompt) {
            yield `Answer: ${prompt}`;
          },
        };
      },
    },
  };
}

const fake = fakeGlobal();
assert.equal(isSupported(fake), true);
assert.equal(await getAvailability(undefined, fake), 'downloadable');

let lastProgress = null;
const session = await createLocalSession({
  globalObject: fake,
  onProgress: (progress) => { lastProgress = progress; },
});

assert.equal(lastProgress.complete, true);
assert.equal(lastProgress.extracting, true);
assert.equal(await promptToText(session, 'test'), 'Answer: test');

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
assert.equal(await nativeSmart.promptToText('native'), 'Answer: native');

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
  async unload() {},
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

console.log('builtin-ai verification: PASS');
