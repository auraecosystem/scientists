from __future__ import annotations

import argparse
import json

from scientists.agents.research import ResearchAgent
from scientists.core.models import AgentTask, KnowledgeRecord
from scientists.knowledge.store import KnowledgeStore
from scientists.runtime.engine import ScientistRuntime


def build_runtime() -> ScientistRuntime:
    store = KnowledgeStore(
        [
            KnowledgeRecord(
                id="aura:scientific-method",
                title="Scientific method",
                content="Observation, hypothesis, experiment, analysis, and reproducible verification form a useful research loop.",
                tags=("method", "reproducibility", "research"),
            ),
            KnowledgeRecord(
                id="aura:provenance",
                title="Research provenance",
                content="Scientific claims should retain source identifiers and evidence so results can be audited.",
                tags=("provenance", "evidence", "audit"),
            ),
        ]
    )
    return ScientistRuntime(store, ResearchAgent())


def main() -> None:
    parser = argparse.ArgumentParser(description="Aura Scientists runtime")
    parser.add_argument("objective", help="Research objective")
    parser.add_argument("--json", action="store_true", help="Emit JSON")
    args = parser.parse_args()
    result = build_runtime().execute(AgentTask(id="cli-task", objective=args.objective))
    if args.json:
        print(json.dumps(result.to_dict(), indent=2))
    else:
        print(result.answer)
        print(f"verified={result.verified} evidence={','.join(result.evidence)}")


if __name__ == "__main__":
    main()
