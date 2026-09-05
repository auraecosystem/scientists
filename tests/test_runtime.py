from scientists.agents.research import ResearchAgent
from scientists.core.models import AgentTask, KnowledgeRecord
from scientists.knowledge.store import KnowledgeStore
from scientists.runtime.engine import ScientistRuntime


def test_search_is_ranked_deterministically() -> None:
    store = KnowledgeStore(
        [
            KnowledgeRecord("b", "Reproducibility", "reproducible research", tags=("research",)),
            KnowledgeRecord("a", "Research", "research research", tags=("science",)),
        ]
    )
    assert [record.id for record in store.search("research")] == ["a", "b"]


def test_runtime_retrieves_and_verifies() -> None:
    store = KnowledgeStore(
        [KnowledgeRecord("x", "Method", "Use reproducible experiments.", tags=("research",))]
    )
    result = ScientistRuntime(store, ResearchAgent()).execute(
        AgentTask("1", "research method")
    )
    assert result.verified is True
    assert result.evidence == ("x",)
    assert "reproducible experiments" in result.answer


def test_empty_objective_is_not_verified() -> None:
    result = ResearchAgent().run(AgentTask("2", ""))
    assert result.verified is False
