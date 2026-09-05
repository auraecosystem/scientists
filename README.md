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

## Chrome Built-in AI

The browser layer in `in-built/builtin-ai.mjs` integrates Chrome's Prompt API (`LanguageModel`) without coupling the Python runtime to a browser. It performs the required capability/availability check, passes identical input/output modality options to `availability()` and `create()`, exposes model download progress, reports the post-download extraction/loading phase, and streams prompt output.

A runnable browser example is available at `in-built/builtin-ai-demo.html`. Open it from a browser context that supports Chrome Built-in AI and the Prompt API. The adapter also exposes `createHybridRunner()` so an application can keep a cloud implementation as a fallback while the local model is unavailable or fails.

The local adapter is deliberately provider-neutral: the repository does not embed cloud credentials or a cloud endpoint. Supply a `cloudPrompt` function from the host application when a hybrid deployment is desired.
