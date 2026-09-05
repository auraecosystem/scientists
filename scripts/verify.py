"""Environment-independent runtime smoke test."""

from scientists.agents.research import ResearchAgent
from scientists.core.models import AgentTask, KnowledgeRecord
from scientists.knowledge.store import KnowledgeStore
from scientists.runtime.engine import ScientistRuntime


def main() -> None:
    runtime = ScientistRuntime(
        KnowledgeStore(
            [KnowledgeRecord("demo", "Demo", "Scientific systems require reproducibility.")]
        ),
        ResearchAgent(),
    )
    result = runtime.execute(AgentTask("verify", "reproducibility"))
    assert result.verified
    print("scientists verification: PASS")


if __name__ == "__main__":
    main()
