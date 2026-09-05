# Aura Scientists

Author: Seriki Yakub

Aura Scientists is a deterministic scientific knowledge and agent runtime with a browser-native multimodal AI layer.

The Python runtime remains organized around deterministic scientific models, knowledge retrieval, agent execution, and verification. The browser layer adds a provider-neutral session contract for text, image, and audio inputs.

## Hybrid browser AI

`in-built/builtin-ai.ts` exposes `SmartLanguageSession` with deterministic provider order:

1. Chrome Built-in AI when the browser exposes `LanguageModel` and the requested capabilities are available.
2. WebLLM/WebGPU for local text inference when enabled and supported.
3. The application's own `/api/chat` endpoint as the server fallback.

Native context metrics are exposed when available. Fallback sessions maintain system prompts, a bounded turn history, and a tokenizer-based history budget. Token counting uses `js-tiktoken` with a Web Worker and main-thread fallback.

Browser media can be normalized from canvas/image/blob/audio/binary inputs into JSON-safe Base64 for the HTTP fallback. Credentials are server-side only.

## Server API

`/api/chat` is a Node.js streaming route. It validates message count, multimodal part count, text size, MIME types, Base64 syntax, aggregate media size, and raw request size before invoking Gemini.

Configuration:

```text
GEMINI_API_KEY=server-side-key
GEMINI_MODEL=gemini-2.5-flash
```

`/api/health` reports service status and whether the server key is configured without returning the key.

## Routes

- `/` — Scientists landing page.
- `/demo` — internal demo route.
- `/chat` — streaming AI chat.
- `/api/chat` — server-side multimodal streaming fallback.
- `/api/health` — health information.

User-facing navigation remains internal to this project. No third-party documentation, CDN runtime, or external redirect is required by the application.

## Browser runtime files

- `in-built/builtin-ai.ts` — hybrid session orchestration.
- `in-built/types.ts` — multimodal and provider types.
- `in-built/token-service.ts` — worker/main-thread token service.
- `in-built/token-worker.ts` — worker tokenizer.
- `in-built/token-main-thread.ts` — main-thread tokenizer fallback.
- `in-built/versioned-idb.ts` — versioned IndexedDB cache.
- `in-built/rank-manifest.ts` — generated tokenizer manifest.
- `in-built/index.ts` — public browser entrypoint.

## Verification

```bash
npm install
npm run test:runtime
npm run build
```

The production build regenerates tokenizer cache metadata from the installed tokenizer assets. CI runs the Python verification suite, TypeScript runtime tests, and Next.js production build.

## Principles

- Model-agnostic intelligence boundary.
- Multimodal text, image, and audio support.
- Local-first execution with graceful fallback.
- Server-side credential isolation.
- Explicit validation and bounded request handling.
- Versioned client tokenizer cache.
- Self-contained user-facing application.
