/**
 * Chrome Built-in AI adapter for Scientists.
 *
 * Keeps model availability, download progress, local session creation, and
 * optional cloud fallback behind one small browser-facing interface.
 */

export const DEFAULT_LANGUAGE_OPTIONS = Object.freeze({
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
});

export function isSupported(globalObject = globalThis) {
  return 'LanguageModel' in globalObject;
}

export async function getAvailability(options = DEFAULT_LANGUAGE_OPTIONS, globalObject = globalThis) {
  if (!isSupported(globalObject)) return 'unsupported';
  return globalObject.LanguageModel.availability(options);
}

export async function createLocalSession({
  options = DEFAULT_LANGUAGE_OPTIONS,
  onProgress = () => {},
  onStatus = () => {},
  globalObject = globalThis,
} = {}) {
  if (!isSupported(globalObject)) {
    throw new Error('Chrome Built-in AI is not supported in this browser.');
  }

  const availability = await getAvailability(options, globalObject);
  if (availability === 'unavailable') {
    throw new Error('Chrome Built-in AI is unavailable on this device.');
  }

  const needsDownload = availability === 'downloadable' || availability === 'downloading';
  onStatus({ state: needsDownload ? 'downloading' : 'ready', availability });

  const session = await globalObject.LanguageModel.create({
    ...options,
    monitor(monitor) {
      monitor.addEventListener('downloadprogress', (event) => {
        const loaded = Number(event.loaded);
        onProgress({
          loaded: Number.isFinite(loaded) ? Math.max(0, Math.min(1, loaded)) : 0,
          complete: loaded >= 1,
          extracting: loaded >= 1 && needsDownload,
        });
      });
    },
  });

  onStatus({ state: 'ready', availability });
  return session;
}

export async function promptStreaming(session, prompt) {
  if (!session || typeof session.promptStreaming !== 'function') {
    throw new TypeError('A valid LanguageModel session is required.');
  }
  if (typeof prompt !== 'string' || !prompt.trim()) {
    throw new TypeError('Prompt must be a non-empty string.');
  }
  return session.promptStreaming(prompt);
}

export async function promptToText(session, prompt, onChunk = () => {}) {
  const stream = await promptStreaming(session, prompt);
  let output = '';
  for await (const chunk of stream) {
    output += chunk;
    onChunk(chunk, output);
  }
  return output;
}

export function createHybridRunner({ localSession, cloudPrompt }) {
  if (typeof cloudPrompt !== 'function') {
    throw new TypeError('cloudPrompt must be a function.');
  }

  return async function run(prompt, { preferLocal = true, onChunk = () => {} } = {}) {
    if (preferLocal && localSession) {
      try {
        return await promptToText(localSession, prompt, onChunk);
      } catch (error) {
        console.warn('Local Built-in AI failed; using cloud fallback.', error);
      }
    }
    const result = await cloudPrompt(prompt);
    onChunk(result, result);
    return result;
  };
}
