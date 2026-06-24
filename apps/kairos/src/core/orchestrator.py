"""
AIOrchestrator — Núcleo unificado do Kairos.

Coordena todo o fluxo de IA:
1. Recupera histórico de conversas (MemoryService)
2. Constrói contexto do usuário (ContextManager)
3. Roteia para o agente especialista (AgentRouter)
4. Executa o agente (Agent + PromptEngine)
5. Critica e refina (auto-avaliação)
6. Persiste na memória (MemoryService)
7. Entrega resposta
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any

from src.core.context_manager import ContextManager
from src.core.router import AgentRouter
from src.core.memory import MemoryService
from src.core.prompt_engine import PromptEngine

logger = logging.getLogger("kairos")


@dataclass
class KairosRequest:
    """Request recebido do DisciplinaApp."""

    user_id: str
    type: str
    message: str
    context: dict[str, Any] = field(default_factory=dict)


@dataclass
class KairosResponse:
    """Resposta entregue ao DisciplinaApp."""

    content: str
    agent: str
    metadata: dict[str, Any] = field(default_factory=dict)


class AIOrchestrator:
    """
    Núcleo unificado do Kairos.
    Coordena: memória -> contexto -> roteamento -> execução -> crítica -> entrega.
    """

    def __init__(self) -> None:
        self.memory = MemoryService()
        self.prompt_engine = PromptEngine()
        self.context_manager = ContextManager(memory=self.memory)
        self.router = AgentRouter()

    async def process(self, request: KairosRequest) -> KairosResponse:
        t_start = time.perf_counter()

        # 1. Recuperar histórico de conversas
        history = await self.memory.get_conversation_history(
            request.user_id, limit=3
        )

        # 2. Construir contexto do usuário com histórico
        t_ctx = time.perf_counter()
        context = await self.context_manager.build(
            request.user_id, request, conversation_history=history
        )
        ctx_ms = int((time.perf_counter() - t_ctx) * 1000)

        # 3. Roteamento: qual agente deve responder?
        agent = self.router.route(request.type, context)

        # 4. Executar agente com contexto
        t_llm = time.perf_counter()
        result = await agent.execute(context, request)
        llm_ms = int((time.perf_counter() - t_llm) * 1000)

        # 5. Crítica e revisão (auto-avaliação)
        if self._needs_review(result):
            result = await self._critique_and_refine(result, agent)

        # 6. Persistir na memória
        await self.memory.store(request.user_id, request, result)

        # 7. Coletar métricas de observabilidade
        total_ms = int((time.perf_counter() - t_start) * 1000)
        metrics = {
            "agent_selected": agent.name,
            "context_load_time_ms": ctx_ms,
            "ollama_response_time_ms": llm_ms,
            "total_request_time_ms": total_ms,
            "memory_entries": len(history),
            "context_size": self._calc_context_size(context),
        }
        logger.info("[METRICS] %s", json.dumps(metrics))
        result.metadata.update(metrics)

        # 8. Entregar resposta
        return KairosResponse(
            content=result.content,
            agent=agent.name,
            metadata=result.metadata,
        )

    def _needs_review(self, result: Any) -> bool:
        """Determina se a resposta precisa de revisão automática."""
        return len(result.content) < 10 or result.content is None

    async def _critique_and_refine(self, result: Any, agent: Any) -> Any:
        """Refina a resposta se a crítica indicar necessidade."""
        # Placeholder: em produção, um agente crítico avalia a resposta
        return result

    def _calc_context_size(self, context: Any) -> int:
        """Calcula o tamanho do contexto para métricas de observabilidade."""
        size = 0
        size += len(context.streaks)
        size += len(context.habits)
        size += len(context.goals)
        size += len(context.conversation_history)
        size += len(context.rag_context)
        if isinstance(context.recent_activity, dict):
            for v in context.recent_activity.values():
                if isinstance(v, list):
                    size += len(v)
                elif isinstance(v, dict):
                    size += len(v)
        return size
