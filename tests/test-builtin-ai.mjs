import assert from 'node:assert/strict';
import {
  createLocalSession,
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
console.log('builtin-ai verification: PASS');
