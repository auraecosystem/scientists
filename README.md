# Aura Scientists

A deterministic scientific knowledge and agent runtime for Aura.

The runtime has four layers: `core` data models, `knowledge` retrieval, `agents` execution, and `runtime` orchestration/verification. The browser layer adds a model-agnostic multimodal session without coupling the Python runtime to a specific provider.

## Universal multimodal hybrid AI

`in-built/builtin-ai.mjs` exposes `SmartLanguageSession` as the unified browser contract. Provider selection is deterministic:

1. Chrome Built-in AI `LanguageModel` is preferred when the required capabilities are available. Native text, image, and audio inputs are passed directly to the browser session.
2. WebLLM/WebGPU is the local text-only fallback when native Built-in AI is unavailable or initialization fails.
3. `/api/chat` is the server-side fallback for unsupported browsers and multimodal requests that cannot be handled by WebLLM.

The client normalizes text and multimodal message arrays and can serialize `HTMLCanvasElement`, `HTMLImageElement`, `Blob`, `AudioBuffer`, `ArrayBuffer`, and typed-array media into JSON-safe Base64 for the HTTP path. Native sessions retain native media objects rather than performing unnecessary serialization.

## Context management

Native sessions expose `contextUsage`, `contextWindow`, `contextUsageRatio`, `measureContextUsage()`, and `contextoverflow` handling when supported by the browser.

Fallback requests use two controls: a turn-based sliding window and a local token-budget window. System prompts are preserved while older conversational turns are evicted. Token counting runs through `TokenService`, which prefers a Web Worker and falls back to the main thread. The tokenizer uses lazy-loaded `js-tiktoken/lite` rank assets and treats its counts as a structural budget proxy; native browser context metrics remain authoritative for native sessions.

## Offline cache and cache invalidation

Tokenizer rank assets are versioned from their content hashes during `npm run prebuild`. IndexedDB accepts a cached rank dictionary only when its manifest hash matches the current build. The Service Worker uses the same combined hash for its CacheStorage namespace and removes older tokenizer cache generations during activation.

The cache path is therefore:

`TokenService → Web Worker → versioned IndexedDB → lazy rank asset → main-thread fallback`

Idle prefetch and bundler chunk hints are retained so the tokenizer does not block the first interactive render unnecessarily.

## Server fallback

`app/api/chat/route.ts` is a Node.js Next.js Route Handler. It accepts the normalized runtime message format as well as the existing AI SDK UI message stream format. It validates message count, multimodal part count, text size, media MIME types, Base64 syntax, aggregate media size, and raw request size before invoking the configured Gemini model through the server-side AI SDK integration.

The server model defaults to `gemini-2.5-flash` and can be changed with `GEMINI_MODEL`. The server requires `GEMINI_API_KEY`; credentials are never placed in browser code.

Streaming is preserved for both contracts: AI SDK `/chat` consumers receive the UI message stream, while the raw runtime fallback receives a UTF-8 text stream from `/api/chat`.

## Quick start

```bash
python -m pip install -e '.[dev]'
python -m pytest
python -m mypy scientists
python scripts/verify.py
python -m scientists.runtime.cli 'research reproducibility' --json
```

For the browser layer:

```bash
npm install
npm run build
node --test tests/test-builtin-ai.mjs
```

The browser runtime is self-contained. It does not require user-facing external documentation links, redirects, CDN-hosted runtime assets, or provider-specific credentials in the client.
