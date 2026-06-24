"""Motivator — Gatilhos contextuais em momentos de baixa."""

from __future__ import annotations

from typing import Any

from src.agents.base_agent import BaseAgent, AgentResult
from src.core.context_manager import UserContext


class Motivator(BaseAgent):
    name = "motivator"
    description = "Gera mensagens motivacionais contextuais"

    async def execute(
        self, context: UserContext, request: Any
    ) -> AgentResult:
        system = self.build_system_prompt(context)
        user_prompt = self._prompt_engine.get_user_prompt(
            request.message, context
        )

        response = await self.call_llm(system, user_prompt)
        return AgentResult(content=response)
