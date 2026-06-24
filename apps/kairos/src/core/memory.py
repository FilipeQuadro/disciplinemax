"""
MemoryService — Memória temporária do Kairos.

Armazenamento em memória RAM (Python dict).
Sem Redis, sem banco vetorial, sem persistência entre reinícios.

Substitui MemoryStore stub por implementação funcional simples.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class InteractionRecord:
    """Registro de uma interação armazenada na memória."""

    user_message: str
    agent_response: str
    agent_name: str


class MemoryService:
    """Gerencia memória temporária de conversas por usuário."""

    def __init__(self) -> None:
        self._store: dict[str, list[InteractionRecord]] = {}

    async def store(
        self, user_id: str, request: Any, result: Any
    ) -> None:
        """Armazena interação na memória RAM.

        Args:
            user_id: ID do usuário.
            request: KairosRequest com a mensagem do usuário.
            result: AgentResult com a resposta do agente.
        """
        record = InteractionRecord(
            user_message=request.message,
            agent_response=result.content,
            agent_name=result.metadata.get("agent", "unknown"),
        )

        if user_id not in self._store:
            self._store[user_id] = []

        self._store[user_id].append(record)

        # Mantém apenas as últimas 50 interações por usuário
        if len(self._store[user_id]) > 50:
            self._store[user_id] = self._store[user_id][-50:]

    async def recall(
        self, user_id: str, query: str = "", limit: int = 5
    ) -> list[InteractionRecord]:
        """Recupera últimas interações do usuário.

        Args:
            user_id: ID do usuário.
            query: Texto da mensagem atual (reservado para busca semântica futura).
            limit: Número máximo de interações a retornar.

        Returns:
            Lista de registros de interação mais recentes.
        """
        records = self._store.get(user_id, [])
        return records[-limit:] if records else []

    async def get_conversation_history(
        self, user_id: str, limit: int = 5
    ) -> list[dict[str, str]]:
        """Retorna histórico formatado para injeção no contexto.

        Args:
            user_id: ID do usuário.
            limit: Número máximo de interações.

        Returns:
            Lista de dicts com user_message e agent_response.
        """
        records = await self.recall(user_id, limit=limit)
        return [
            {
                "user_message": r.user_message,
                "agent_response": r.agent_response,
            }
            for r in records
        ]
