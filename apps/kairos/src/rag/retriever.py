"""
Retriever — Busca semântica (RAG).

Stub mínimo. Implementação completa será feita na Fase 2 do roadmap.
"""

from __future__ import annotations


class Retriever:
    """Busca semântica no Vector DB. Stub — retorna lista vazia."""

    async def search(
        self, user_id: str, query: str, limit: int = 5
    ) -> list[str]:
        """Busca contextos relevantes para a query do usuário."""
        return []
