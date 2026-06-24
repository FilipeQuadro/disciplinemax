"""
BaseSkill — Classe base para as 24 skills do BusinessAdvisor.

Cada skill é um prompt template + schema de entrada/saída.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from src.core.context_manager import UserContext
from src.core.llm_service import LLMService


@dataclass
class SkillResult:
    """Resultado da execução de uma skill."""

    content: str
    metadata: dict[str, Any] = field(default_factory=dict)


class BaseSkill(ABC):
    """Classe base para skills do BusinessAdvisor."""

    id: str = ""
    name: str = ""
    category: str = ""
    plan_required: str = "PREMIUM"
    system_prompt: str = ""

    def __init__(self) -> None:
        self._llm_service = LLMService()

    @abstractmethod
    async def execute(
        self, context: UserContext, inputs: Any
    ) -> SkillResult:
        """Executa a skill com contexto e inputs do usuário."""
        ...

    async def call_llm(self, system: str, user_input: str) -> str:
        """Chama o LLM com o system prompt da skill."""
        return await self._llm_service.generate(system, user_input)
