from __future__ import annotations

from abc import ABC, abstractmethod

from scientists.core.models import AgentResult, AgentTask


class ScientistAgent(ABC):
    """Base contract for deterministic scientist agents."""

    name = "scientist"

    @abstractmethod
    def run(self, task: AgentTask) -> AgentResult:
        raise NotImplementedError
