from __future__ import annotations

from collections.abc import Iterable

from scientists.core.models import KnowledgeRecord


class KnowledgeStore:
    """Small deterministic in-memory knowledge index."""

    def __init__(self, records: Iterable[KnowledgeRecord] = ()) -> None:
        self._records: dict[str, KnowledgeRecord] = {record.id: record for record in records}

    def add(self, record: KnowledgeRecord) -> None:
        self._records[record.id] = record

    def get(self, record_id: str) -> KnowledgeRecord | None:
        return self._records.get(record_id)

    def search(self, query: str, limit: int = 10) -> list[KnowledgeRecord]:
        if limit < 1:
            return []
        terms = tuple(term.lower() for term in query.split() if term.strip())
        if not terms:
            return list(self._records.values())[:limit]

        scored: list[tuple[int, KnowledgeRecord]] = []
        for record in self._records.values():
            haystack = " ".join((record.title, record.content, *record.tags)).lower()
            score = sum(haystack.count(term) for term in terms)
            if score:
                scored.append((score, record))
        scored.sort(key=lambda item: (-item[0], item[1].id))
        return [record for _, record in scored[:limit]]

    def __len__(self) -> int:
        return len(self._records)
