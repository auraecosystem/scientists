from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping


@dataclass(frozen=True, slots=True)
class KnowledgeRecord:
    """A provenance-aware scientific knowledge unit."""

    id: str
    title: str
    content: str
    source: str = "local"
    tags: tuple[str, ...] = ()
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "source": self.source,
            "tags": list(self.tags),
            "metadata": dict(self.metadata),
        }


@dataclass(frozen=True, slots=True)
class AgentTask:
    """A task submitted to the scientist runtime."""

    id: str
    objective: str
    context: tuple[KnowledgeRecord, ...] = ()


@dataclass(frozen=True, slots=True)
class AgentResult:
    """Verified result returned by an agent."""

    task_id: str
    answer: str
    evidence: tuple[str, ...] = ()
    verified: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "task_id": self.task_id,
            "answer": self.answer,
            "evidence": list(self.evidence),
            "verified": self.verified,
        }
