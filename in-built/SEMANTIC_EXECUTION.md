# Semantic Create → Validate

The browser-native AI runtime maps the Q-lang/Web4 semantic directive `^D Create → Validate` onto an explicit execution contract.

`createSemanticExecution()` constructs a `SmartLanguageSession` from a semantic request. It carries declared modalities, output type, resource constraints, and provider policy into the session creation path.

`validateSemanticExecution()` is the pre-execution gate. It verifies request structure, provider capability, local-only policy, resource bounds, and session provenance. A rejected state is not executable.

`executeSemanticText()` performs execution only after validation. `validateSemanticResult()` validates the returned artifact against the declared result contract; JSON results receive structural checks for valid JSON, object type, and required properties.

Provider routing remains the existing runtime policy:

```text
Native Prompt API → WebLLM → cloud fallback
```

The semantic layer does not replace that provider logic. It adds a deterministic contract around it.

The Prompt API knowledge in `.gemini/prompt-api.md` remains the browser capability reference; this document is the runtime semantic contract derived from that capability surface.
