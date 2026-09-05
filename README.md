# Aura Scientists

A deterministic scientific knowledge and agent runtime for Aura.

The runtime has four layers: `core` data models, `knowledge` retrieval, `agents` execution, and `runtime` orchestration/verification. It is dependency-light so the scientific execution contract can be tested before model providers or external services are introduced.

## Quick start

```bash
python -m pip install -e '.[dev]'
python -m pytest
python -m mypy scientists
python scripts/verify.py
python -m scientists.runtime.cli 'research reproducibility' --json
```

The runtime retrieves matching knowledge records, executes a research agent, retains evidence identifiers, and verifies that a non-empty result was produced.

## Chrome Built-in AI and graceful fallback

The browser layer in `in-built/builtin-ai.mjs` integrates Chrome's Prompt API (`LanguageModel`) without coupling the Python runtime to a browser. It performs feature detection, checks capability/availability, passes identical input/output modality options to `availability()` and `create()`, exposes model download progress, reports the post-download extraction/loading phase, and streams prompt output.

`SmartLanguageSession` provides one `promptStreaming()` contract for both native and fallback execution. If `LanguageModel` is missing, reports `unavailable`, or fails during initialization, the session automatically routes prompts to the host application's fallback HTTP endpoint. The default endpoint is `/api/chat-fallback`; applications can provide another endpoint with `fallbackEndpoint`.

The fallback endpoint receives:

```json
{ "prompt": "..." }
```

and should return a successful HTTP response whose body is a UTF-8 text stream. Credentials and provider-specific API calls belong on the server, where the endpoint can wrap OpenAI, Gemini, Claude, or another provider. No cloud credentials are embedded in this repository.

A runnable browser example is available at `in-built/builtin-ai-demo.html`. It automatically selects the native model when available and otherwise reports that it is using the cloud fallback. During local model download it displays progress; after `loaded === 1`, it switches the progress indicator to an indeterminate extraction/loading state until the native session is ready.

The lower-level `createHybridRunner()` remains available for applications that already have a local session and want to inject their own `cloudPrompt` function. `SmartLanguageSession` is the recommended entry point when feature detection and fallback selection should be handled automatically.
