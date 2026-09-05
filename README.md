# Aura Scientists

**Author: Seriki Yakub**

Aura Scientists is a deterministic scientific knowledge and agent runtime for building AI-first scientific applications. It combines structured scientific knowledge, retrieval, agent execution, runtime verification, and a browser-native multimodal AI layer.

Seriki Yakub is the author and builder behind Web4application, focused on production-ready AI applications, developer tooling, conversational interfaces, reproducible systems, and turning research-oriented prototypes into maintainable software.

## What Scientists provides

Scientists is designed as a model-agnostic intelligence runtime. The Python core provides deterministic scientific knowledge and agent execution, while the browser runtime provides a unified multimodal session contract.

The architecture is intentionally provider-independent. A browser session can use native Chrome Built-in AI when available, fall back to local WebLLM/WebGPU for text, and finally use the application's own `/api/chat` server endpoint when local execution cannot satisfy the request.

## Architecture

The Python runtime is organized into four layers:

- `core` — deterministic data models and runtime primitives.
- `knowledge` — scientific knowledge and retrieval.
- `agents` — task execution and agent behavior.
- `runtime` — orchestration, verification, and command-line execution.

The browser layer is implemented in TypeScript and provides the multimodal intelligence boundary without coupling the Python runtime to a particular model provider.

## Universal multimodal hybrid AI

`in-built/builtin-ai.ts` exposes `SmartLanguageSession` as the unified browser contract.

Provider selection is deterministic:

1. Chrome Built-in AI `LanguageModel` is preferred when the required capabilities are available. Native text, image, and audio inputs remain native browser objects.
2. WebLLM/WebGPU is used as the local text-only fallback when native Built-in AI is unavailable or initialization fails.
3. `/api/chat` is used as the server-side fallback for unsupported browsers and multimodal requests that cannot be handled locally.

The runtime supports text, image, and audio message parts and can normalize browser media such as `HTMLCanvasElement`, `HTMLImageElement`, `Blob`, `AudioBuffer`, `ArrayBuffer`, and typed arrays into JSON-safe Base64 for the HTTP fallback.

## Context management

Native sessions expose context usage metrics when supported by the browser, including `contextUsage`, `contextWindow`, `contextUsageRatio`, `measureContextUsage()`, and `contextoverflow` handling.

Fallback conversations use both a turn-based sliding window and a local token-budget window. System prompts are preserved while older conversational turns are evicted.

Token counting runs through `TokenService`, which prefers a Web Worker and falls back to the main thread. The tokenizer uses lazy-loaded `js-tiktoken/lite` rank assets. These counts are treated as a structural budget proxy; native browser context metrics remain authoritative for native sessions.

## Offline cache and cache invalidation

Tokenizer rank assets are versioned from their content hashes during the prebuild step. IndexedDB accepts cached rank data only when its manifest hash matches the current build.

The Service Worker uses the same combined content hash for its CacheStorage namespace and removes older tokenizer cache generations during activation.

The cache path is:

`TokenService → Web Worker → versioned IndexedDB → lazy rank asset → main-thread fallback`

Idle prefetch and bundler chunk hints are retained so tokenizer initialization does not unnecessarily block the first interactive render.

## Server fallback

`app/api/chat/route.ts` is a Node.js Next.js Route Handler. It accepts both the normalized Scientists runtime message format and the AI SDK UI message format.

Before invoking the configured Gemini model, the endpoint validates message count, multimodal part count, text size, media MIME types, Base64 syntax, aggregate media size, and raw request size.

The server model defaults to `gemini-2.5-flash` and can be changed with `GEMINI_MODEL`. The server requires `GEMINI_API_KEY`; credentials remain server-side and are never placed in browser code.

Streaming is preserved for both contracts: AI SDK consumers receive a UI message stream, while the browser runtime fallback receives a UTF-8 text stream.

## Application routes

- `/` — self-contained Scientists landing page.
- `/demo` — internal demo entry point that remains inside the application and forwards to `/chat`.
- `/chat` — interactive AI chat interface.
- `/api/chat` — streaming server-side AI fallback.
- `/api/health` — runtime health endpoint that reports service status and configuration state without exposing credentials.

All user-facing navigation remains internal to the Scientists application. The project does not depend on external documentation links, external redirects, CDN-hosted runtime assets, or client-side provider credentials.

## TypeScript browser runtime

The active browser implementation is TypeScript rather than a parallel JavaScript implementation.

Important files include:

- `in-built/builtin-ai.ts` — hybrid multimodal session orchestration.
- `in-built/types.ts` — shared runtime and multimodal types.
- `in-built/index.ts` — public browser runtime entrypoint.
- `in-built/token-service.ts` — tokenizer service and worker coordination.
- `in-built/token-main-thread.ts` — main-thread tokenizer fallback.
- `in-built/token-worker.ts` — Web Worker tokenizer execution.
- `in-built/versioned-idb.ts` — versioned IndexedDB cache.
- `in-built/rank-manifest.ts` — generated tokenizer asset manifest.
- `tests/test-builtin-ai.ts` — browser runtime test suite.

The TypeScript configuration is strict and covers the browser runtime, Next.js application code, and shared type declarations.

## Environment

The server requires:

```text
GEMINI_API_KEY=your-server-side-key
```

The model is optional:

```text
GEMINI_MODEL=gemini-2.5-flash
```

Never commit `.env`, `.env.local`, or a real API key. Local secret files and generated build artifacts are excluded by `.gitignore`.

## Quick start

Python runtime:

```bash
python -m pip install -e '.[dev]'
python -m pytest
python -m mypy scientists
python scripts/verify.py
python -m scientists.runtime.cli 'research reproducibility' --json
```

Browser and Next.js runtime:

```bash
npm install
npm run build
npm run test:runtime
```

Development server:

```bash
npm run dev
```

Then use the internal application routes `/`, `/demo`, and `/chat`.

## Verification

The project is designed around deterministic verification rather than provider-specific behavior. The Python verification suite checks the scientific runtime, while the TypeScript browser tests cover multimodal serialization, provider fallback, context handling, token budgeting, and streaming behavior.

The production build also regenerates the tokenizer rank manifest before compilation so cache generations track the actual bundled tokenizer assets.

## Author

### Seriki Yakub

Seriki Yakub is the author of Aura Scientists and the builder behind Web4application. His work focuses on AI-first web applications, developer tools, conversational interfaces, model-driven architectures, and reproducible software systems.

His engineering approach emphasizes fast prototyping followed by production hardening, with particular attention to performance, observability, cost control, verification, maintainability, and developer experience.

Scientists reflects that approach by keeping the scientific runtime deterministic while allowing the intelligence layer to evolve independently across native browser AI, local inference, and server-side execution.

## Project principles

- **Model agnostic:** intelligence providers are adapters, not the application contract.
- **Multimodal:** text, image, and audio are first-class runtime inputs.
- **Deterministic:** scientific knowledge and verification remain explicit and testable.
- **Local first:** capable browsers can execute inference locally.
- **Graceful fallback:** unavailable local capabilities do not terminate the application flow.
- **Secure by boundary:** server credentials remain server-side.
- **Reproducible:** generated tokenizer cache versions track content changes.
- **Self-contained:** user-facing navigation and runtime assets remain inside the project.

## License

See the repository license file for the governing terms.

---

**Aura Scientists — authored by Seriki Yakub.**
