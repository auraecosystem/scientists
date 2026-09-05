/**
 * Scientists browser AI runtime.
 *
 * Provider order: Chrome Built-in AI -> WebLLM/WebGPU -> server fallback.
 * Every provider exposes the same async promptStreaming contract.
 */

export const DEFAULT_LANGUAGE_OPTIONS = Object.freeze({
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
});

export const DEFAULT_WEBLLM_MODEL = 'Llama-3.2-3B-Instruct-q4f16_1-MLC';

export function isSupported(globalObject = globalThis) {
  return 'LanguageModel' in globalObject;
}

export function isWebLLMSupported(globalObject = globalThis) {
  return Boolean(globalObject.navigator?.gpu);
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

async function* streamNative(session, prompt) {
  const stream = await session.promptStreaming(prompt);
  for await (const chunk of stream) yield chunk;
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

/** WebLLM adapter. The package is loaded only when this provider is selected. */
export async function createWebLLMSession({
  model = DEFAULT_WEBLLM_MODEL,
  onProgress = () => {},
  onStatus = () => {},
  globalObject = globalThis,
  webllmModule = null,
} = {}) {
  if (!isWebLLMSupported(globalObject)) {
    throw new Error('WebGPU is not supported in this browser.');
  }

  const webllm = webllmModule ?? await import('@mlc-ai/web-llm');
  onStatus({ state: 'downloading', source: 'webllm', model });

  const engine = await webllm.CreateMLCEngine(model, {
    initProgressCallback(progress) {
      const value = typeof progress === 'object' && progress !== null
        ? Number(progress.progress)
        : Number(progress);
      onProgress({
        loaded: Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0,
        complete: value >= 1,
        extracting: value >= 1,
        source: 'webllm',
      });
    },
  });

  onStatus({ state: 'ready', source: 'webllm', model });
  return engine;
}

async function* streamWebLLM(engine, prompt) {
  const stream = await engine.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk?.choices?.[0]?.delta?.content;
    if (typeof text === 'string' && text) yield text;
  }
}

/**
 * Unified browser session. Native is preferred, then WebLLM/WebGPU, then HTTP.
 */
export class SmartLanguageSession {
  constructor(nativeSession = null, apiEndpoint = '/api/chat-fallback', fetchImpl = globalThis.fetch, webllmSession = null) {
    this.nativeSession = nativeSession;
    this.apiEndpoint = apiEndpoint;
    this.fetchImpl = fetchImpl;
    this.webllmSession = webllmSession;
    this.source = nativeSession ? 'native' : webllmSession ? 'webllm' : 'cloud';
  }

  static async create({
    options = DEFAULT_LANGUAGE_OPTIONS,
    fallbackEndpoint = '/api/chat-fallback',
    onProgress = () => {},
    onStatus = () => {},
    globalObject = globalThis,
    fetchImpl = globalObject.fetch?.bind(globalObject),
    preferWebLLM = true,
    webllmModel = DEFAULT_WEBLLM_MODEL,
    webllmModule = null,
  } = {}) {
    if (isSupported(globalObject)) {
      try {
        const availability = await getAvailability(options, globalObject);
        if (availability !== 'unavailable') {
          const nativeSession = await createLocalSession({ options, onProgress, onStatus, globalObject });
          onStatus({ state: 'ready', source: 'native', availability });
          return new SmartLanguageSession(nativeSession, fallbackEndpoint, fetchImpl);
        }
      } catch (error) {
        console.warn('Native LanguageModel initialization failed; trying fallback.', error);
      }
    }

    if (preferWebLLM && isWebLLMSupported(globalObject)) {
      try {
        const webllmSession = await createWebLLMSession({
          model: webllmModel,
          onProgress,
          onStatus,
          globalObject,
          webllmModule,
        });
        return new SmartLanguageSession(null, fallbackEndpoint, fetchImpl, webllmSession);
      } catch (error) {
        console.warn('WebLLM initialization failed; using server fallback.', error);
      }
    }

    if (typeof fetchImpl !== 'function') {
      throw new Error('No AI provider is available in this environment.');
    }

    onStatus({ state: 'ready', source: 'cloud', availability: 'fallback' });
    return new SmartLanguageSession(null, fallbackEndpoint, fetchImpl);
  }

  async *promptStreaming(prompt) {
    if (typeof prompt !== 'string' || !prompt.trim()) {
      throw new TypeError('Prompt must be a non-empty string.');
    }

    if (this.nativeSession) {
      yield* streamNative(this.nativeSession, prompt);
      return;
    }

    if (this.webllmSession) {
      yield* streamWebLLM(this.webllmSession, prompt);
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

  async destroy() {
    this.nativeSession?.destroy?.();
    if (typeof this.webllmSession?.unload === 'function') {
      await this.webllmSession.unload();
    }
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
        return await localSession.promptToText(prompt, onChunk);
      } catch (error) {
        console.warn('Local AI failed; using cloud fallback.', error);
      }
    }
    const result = await cloudPrompt(prompt);
    onChunk(result, result);
    return result;
  };
}
