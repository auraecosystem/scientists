from __future__ import annotations

from scientists.agents.base import ScientistAgent
from scientists.core.models import AgentResult, AgentTask
from scientists.knowledge.store import KnowledgeStore


class ScientistRuntime:
    """Coordinates retrieval, agent execution, and result verification."""

    def __init__(self, store: KnowledgeStore, agent: ScientistAgent) -> None:
        self.store = store
        self.agent = agent

    def execute(self, task: AgentTask, *, retrieve_limit: int = 5) -> AgentResult:
        if not task.context:
            records = tuple(self.store.search(task.objective, limit=retrieve_limit))
            task = AgentTask(id=task.id, objective=task.objective, context=records)
        return self.verify(self.agent.run(task))

    @staticmethod
    def verify(result: AgentResult) -> AgentResult:
        verified = result.verified and bool(result.answer.strip())
        return AgentResult(
            task_id=result.task_id,
            answer=result.answer,
            evidence=result.evidence,
            verified=verified,
        )
