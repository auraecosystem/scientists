/**
 * Chrome Built-in AI adapter for Scientists.
 *
 * Provides one browser-facing session contract. Chrome's native
 * LanguageModel is preferred when available; otherwise prompts are streamed
 * from a host-provided HTTP endpoint without changing the UI contract.
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

async function* streamFallbackResponse(response) {
  if (!response.body) {
    const text = await response.text();
    if (text) yield text;
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) yield chunk;
  }
  const tail = decoder.decode();
  if (tail) yield tail;
}

/**
 * Unified native/cloud session. The cloud endpoint is intentionally supplied
 * by the host application so credentials and provider choice stay server-side.
 */
export class SmartLanguageSession {
  constructor(nativeSession = null, apiEndpoint = '/api/chat-fallback', fetchImpl = globalThis.fetch) {
    this.nativeSession = nativeSession;
    this.apiEndpoint = apiEndpoint;
    this.fetchImpl = fetchImpl;
  }

  static async create({
    options = DEFAULT_LANGUAGE_OPTIONS,
    fallbackEndpoint = '/api/chat-fallback',
    onProgress = () => {},
    onStatus = () => {},
    globalObject = globalThis,
    fetchImpl = globalObject.fetch?.bind(globalObject),
  } = {}) {
    if (isSupported(globalObject)) {
      try {
        const availability = await getAvailability(options, globalObject);
        if (availability !== 'unavailable') {
          const nativeSession = await createLocalSession({
            options,
            onProgress,
            onStatus,
            globalObject,
          });
          onStatus({ state: 'ready', source: 'native', availability });
          return new SmartLanguageSession(nativeSession, fallbackEndpoint, fetchImpl);
        }
      } catch (error) {
        console.warn('Native LanguageModel initialization failed; using fallback.', error);
      }
    }

    if (typeof fetchImpl !== 'function') {
      throw new Error('No cloud fallback is available in this environment.');
    }

    onStatus({ state: 'ready', source: 'cloud', availability: 'fallback' });
    return new SmartLanguageSession(null, fallbackEndpoint, fetchImpl);
  }

  async *promptStreaming(prompt) {
    if (typeof prompt !== 'string' || !prompt.trim()) {
      throw new TypeError('Prompt must be a non-empty string.');
    }

    if (this.nativeSession) {
      const stream = await this.nativeSession.promptStreaming(prompt);
      for await (const chunk of stream) yield chunk;
      return;
    }

    const response = await this.fetchImpl(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Fallback API failed with status ${response.status}`);
    }

    yield* streamFallbackResponse(response);
  }

  async promptToText(prompt, onChunk = () => {}) {
    let output = '';
    for await (const chunk of this.promptStreaming(prompt)) {
      output += chunk;
      onChunk(chunk, output);
    }
    return output;
  }

  destroy() {
    this.nativeSession?.destroy?.();
  }
}

export const createSmartSession = (options = {}) => SmartLanguageSession.create(options);

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
