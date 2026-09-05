import assert from 'node:assert/strict';
import {
  SmartLanguageSession,
  createLocalSession,
  createSmartSession,
  getAvailability,
  isSupported,
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
assert.equal(fallbackStatus.source, 'cloud');
assert.equal(await cloud.promptToText('hello'), 'cloud answer');

const nativeSmart = await createSmartSession({
  globalObject: fake,
  fetchImpl: async () => { throw new Error('native should be preferred'); },
});
assert.ok(nativeSmart.nativeSession);
assert.equal(await nativeSmart.promptToText('native'), 'Answer: native');

const failingNative = {
  LanguageModel: {
    async availability() { return 'available'; },
    async create() { throw new Error('native initialization failed'); },
  },
};
const recovered = await createSmartSession({
  globalObject: failingNative,
  fetchImpl: async () => new Response('recovered cloud answer', { status: 200 }),
});
assert.equal(recovered.nativeSession, null);
assert.equal(await recovered.promptToText('recover'), 'recovered cloud answer');

console.log('builtin-ai verification: PASS');
