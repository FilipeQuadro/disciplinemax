"""
ContextManager — Constrói o contexto técnico do usuário.

A partir dos dados do DisciplinaApp (hábitos, leituras, sessões Pomodoro,
streaks, metas) e do histórico de conversas, constrói um contexto
estruturado para alimentar os agentes.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from src.core.context_provider import ApiContextProvider, ContextProvider
from src.core.memory import MemoryService
from src.rag.retriever import Retriever


@dataclass
class UserContext:
    """Contexto estruturado de um usuário."""

    user_id: str
    profile: dict[str, Any] = field(default_factory=dict)
    recent_activity: dict[str, Any] = field(default_factory=dict)
    streaks: dict[str, int] = field(default_factory=dict)
    habits: list[dict[str, Any]] = field(default_factory=list)
    goals: list[dict[str, Any]] = field(default_factory=list)
    rag_context: list[str] = field(default_factory=list)
    preferences: dict[str, Any] = field(default_factory=dict)
    conversation_history: list[dict[str, str]] = field(default_factory=list)


class ContextManager:
    """Gerencia a construção de contexto para os agentes."""

    def __init__(
        self,
        memory: MemoryService | None = None,
        context_provider: ContextProvider | None = None,
    ) -> None:
        self.retriever = Retriever()
        self.memory = memory or MemoryService()
        self.context_provider = context_provider or ApiContextProvider()

    async def build(
        self,
        user_id: str,
        request: Any,
        conversation_history: list[dict[str, str]] | None = None,
    ) -> UserContext:
        """Constrói contexto completo a partir dos dados do usuário.

        Args:
            user_id: ID do usuário.
            request: Request original do Kairos.
            conversation_history: Histórico de conversas do MemoryService.
        """
        context = UserContext(user_id=user_id)

        # 1. Buscar dados agregados do usuário via ContextProvider
        auth_token = ""
        if isinstance(request.context, dict):
            auth_token = request.context.get("auth_token", "")

        raw = await self.context_provider.get_context(user_id, auth_token)

        # 2. Distribuir dados para os pontos de extensão (_fetch_*)
        context.profile = await self._fetch_user_profile(user_id, raw)
        context.recent_activity = await self._fetch_recent_activity(user_id, raw)
        context.streaks = await self._fetch_streaks(user_id, raw)
        context.habits = await self._fetch_habits(user_id, raw)
        context.goals = await self._fetch_goals(user_id, raw)
        context.preferences = await self._fetch_preferences(user_id, raw)

        # 3. Busca semântica (RAG) para enriquecer contexto
        context.rag_context = await self.retriever.search(
            user_id, request.message, limit=5
        )

        # 4. Histórico de conversas (do MemoryService)
        context.conversation_history = conversation_history or []

        return context

    async def _fetch_user_profile(
        self, user_id: str, raw_context: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Extrai perfil do contexto agregado."""
        if not raw_context:
            return {"user_id": user_id}
        profile = raw_context.get("profile", {})
        profile["user_id"] = user_id
        return profile

    async def _fetch_recent_activity(
        self, user_id: str, raw_context: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Extrai atividade recente (livros + pomodoro) do contexto agregado."""
        if not raw_context:
            return {}
        return {
            "books": raw_context.get("books", []),
            "pomodoro": raw_context.get("pomodoro", {}),
            "bible": raw_context.get("bible", {}),
        }

    async def _fetch_streaks(
        self, user_id: str, raw_context: dict[str, Any] | None = None
    ) -> dict[str, int]:
        """Extrai streaks do contexto agregado."""
        if not raw_context:
            return {}
        return {
            s["type"]: s["currentCount"]
            for s in raw_context.get("streaks", [])
        }

    async def _fetch_habits(
        self, user_id: str, raw_context: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        """Extrai hábitos do contexto agregado."""
        if not raw_context:
            return []
        return raw_context.get("habits", [])

    async def _fetch_goals(
        self, user_id: str, raw_context: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        """Extrai metas do contexto agregado."""
        if not raw_context:
            return []
        return raw_context.get("goals", [])

    async def _fetch_preferences(
        self, user_id: str, raw_context: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Extrai preferências do perfil no contexto agregado."""
        if not raw_context:
            return {"personality": "encorajador"}
        profile = raw_context.get("profile", {})
        return {
            "personality": profile.get("personality", "encorajador"),
            **profile.get("preferences", {}),
        }
