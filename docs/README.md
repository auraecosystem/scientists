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
