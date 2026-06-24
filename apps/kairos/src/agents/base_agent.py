"""
BaseAgent — Classe base para todos os agentes do Kairos.

Cada agente especialista herda desta classe e implementa execute().
System prompts são delegados ao PromptEngine.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from src.core.context_manager import UserContext
from src.core.llm_service import LLMService
from src.core.prompt_engine import PromptEngine


@dataclass
class AgentResult:
    """Resultado da execução de um agente."""

    content: str
    metadata: dict[str, Any] = field(default_factory=dict)


class BaseAgent(ABC):
    """Classe base abstrata para agentes especialistas do Kairos."""

    name: str = "base_agent"
    description: str = ""

    def __init__(self) -> None:
        self._prompt_engine = PromptEngine()
        self._llm_service = LLMService()

    @abstractmethod
    async def execute(
        self, context: UserContext, request: Any
    ) -> AgentResult:
        """Executa a lógica do agente com base no contexto e request."""
        ...

    def build_system_prompt(self, context: UserContext) -> str:
        """Constrói o system prompt via PromptEngine."""
        return self._prompt_engine.get_system_prompt(self.name, context)

    async def call_llm(self, system: str, user_input: str) -> str:
        """Chama o LLM (Ollama) com o prompt."""
        return await self._llm_service.generate(system, user_input)
