/**
 * Scientists browser AI runtime.
 *
 * Provider order: Chrome Built-in AI -> WebLLM/WebGPU -> server fallback.
 * Every provider exposes a normalized async promptStreaming contract.
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
  signal,
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
  onStatus({ state: needsDownload ? 'downloading' : 'ready', source: 'native', availability });

  const createOptions = {
    ...options,
    ...(signal ? { signal } : {}),
    monitor(monitor) {
      monitor.addEventListener('downloadprogress', (event) => {
        const loaded = Number(event.loaded);
        const bounded = Number.isFinite(loaded) ? Math.max(0, Math.min(1, loaded)) : 0;
        onProgress({
          loaded: bounded,
          complete: bounded >= 1,
          extracting: bounded >= 1 && needsDownload,
          source: 'native',
        });
      });
    },
  };

  const session = await globalObject.LanguageModel.create(createOptions);
  onStatus({ state: 'ready', source: 'native', availability });
  return session;
}

export async function promptStreaming(session, prompt, options = {}) {
  if (!session || typeof session.promptStreaming !== 'function') {
    throw new TypeError('A valid LanguageModel session is required.');
  }
  if (typeof prompt !== 'string' || !prompt.trim()) {
    throw new TypeError('Prompt must be a non-empty string.');
  }
  return session.promptStreaming(prompt, options);
}

async function* streamNative(session, prompt, options) {
  const stream = await session.promptStreaming(prompt, options);
  for await (const chunk of stream) yield chunk;
}

/**
 * Normalize Chrome implementations that may emit either cumulative or delta
 * chunks. Consumers always receive delta chunks from this generator.
 */
export async function* normalizeStream(stream) {
  let accumulated = '';
  for await (const rawChunk of stream) {
    const chunk = typeof rawChunk === 'string' ? rawChunk : String(rawChunk ?? '');
    if (!chunk) continue;

    if (accumulated && chunk.startsWith(accumulated)) {
      const delta = chunk.slice(accumulated.length);
      accumulated = chunk;
      if (delta) yield delta;
      continue;
    }

    accumulated += chunk;
    yield chunk;
  }
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
      const bounded = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
      onProgress({
        loaded: bounded,
        complete: bounded >= 1,
        extracting: bounded >= 1,
        source: 'webllm',
      });
    },
  });

  onStatus({ state: 'ready', source: 'webllm', model });
  return engine;
}

async function* streamWebLLM(engine, prompt, options = {}) {
  const stream = await engine.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  });

  for await (const chunk of stream) {
    if (options.signal?.aborted) {
      throw new DOMException('The prompt was aborted.', 'AbortError');
    }
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
    signal,
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
          const nativeSession = await createLocalSession({
            options,
            signal,
            onProgress,
            onStatus,
            globalObject,
          });
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

  async *promptStreaming(prompt, options = {}) {
    if (typeof prompt !== 'string' || !prompt.trim()) {
      throw new TypeError('Prompt must be a non-empty string.');
    }

    if (this.nativeSession) {
      yield* normalizeStream(streamNative(this.nativeSession, prompt, options));
      return;
    }

    if (this.webllmSession) {
      yield* streamWebLLM(this.webllmSession, prompt, options);
      return;
    }

    if (options.signal?.aborted) {
      throw new DOMException('The prompt was aborted.', 'AbortError');
    }

    const response = await this.fetchImpl(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      ...(options.signal ? { signal: options.signal } : {}),
    });

    if (!response.ok) {
      throw new Error(`Fallback API failed with status ${response.status}`);
    }

    yield* streamFallbackResponse(response);
  }

  async promptToText(prompt, onChunk = () => {}, options = {}) {
    let output = '';
    for await (const chunk of this.promptStreaming(prompt, options)) {
      output += chunk;
      onChunk(chunk, output);
    }
    return output;
  }

  async append(messages) {
    if (!this.nativeSession || typeof this.nativeSession.append !== 'function') {
      throw new Error('append() is only available for Chrome Built-in AI sessions.');
    }
    return this.nativeSession.append(messages);
  }

  async clone(options = {}) {
    if (!this.nativeSession || typeof this.nativeSession.clone !== 'function') {
      throw new Error('clone() is only available for Chrome Built-in AI sessions.');
    }
    const cloned = await this.nativeSession.clone(options);
    return new SmartLanguageSession(cloned, this.apiEndpoint, this.fetchImpl);
  }

  get contextUsage() {
    return this.nativeSession?.contextUsage;
  }

  get contextWindow() {
    return this.nativeSession?.contextWindow;
  }

  addEventListener(...args) {
    if (typeof this.nativeSession?.addEventListener !== 'function') return undefined;
    return this.nativeSession.addEventListener(...args);
  }

  async destroy() {
    this.nativeSession?.destroy?.();
    if (typeof this.webllmSession?.unload === 'function') {
      await this.webllmSession.unload();
    }
    this.nativeSession = null;
    this.webllmSession = null;
  }
}

export const createSmartSession = (options = {}) => SmartLanguageSession.create(options);

export function createHybridRunner({ localSession, cloudPrompt }) {
  if (typeof cloudPrompt !== 'function') {
    throw new TypeError('cloudPrompt must be a function.');
  }

  return async function run(prompt, { preferLocal = true, onChunk = () => {}, options = {} } = {}) {
    if (preferLocal && localSession) {
      try {
        return await localSession.promptToText(prompt, onChunk, options);
      } catch (error) {
        console.warn('Local AI failed; using cloud fallback.', error);
      }
    }
    const result = await cloudPrompt(prompt);
    onChunk(result, result);
    return result;
  };
}
