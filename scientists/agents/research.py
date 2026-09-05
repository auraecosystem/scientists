from __future__ import annotations

from scientists.agents.base import ScientistAgent
from scientists.core.models import AgentResult, AgentTask


class ResearchAgent(ScientistAgent):
    """Produces an evidence-grounded synthesis from supplied context."""

    name = "research"

    def run(self, task: AgentTask) -> AgentResult:
        if not task.objective.strip():
            return AgentResult(task.id, "Objective is empty.", verified=False)
        if not task.context:
            return AgentResult(task.id, "No knowledge records were supplied.", verified=False)

        evidence = tuple(record.id for record in task.context)
        synthesis = " ".join(
            f"[{record.id}] {record.content.strip()}" for record in task.context
        )
        answer = f"Objective: {task.objective.strip()} Evidence synthesis: {synthesis}"
        return AgentResult(task.id, answer, evidence=evidence, verified=True)
