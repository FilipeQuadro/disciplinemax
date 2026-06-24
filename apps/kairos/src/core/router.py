"""
AgentRouter — Roteamento dinâmico de agentes.

Determina qual agente especialista deve responder com base
no tipo de request e no contexto do usuário.
"""

from __future__ import annotations

from typing import Any

from src.agents.base_agent import BaseAgent
from src.agents.habit_coach import HabitCoach
from src.agents.reading_coach import ReadingCoach
from src.agents.bible_coach import BibleCoach
from src.agents.focus_coach import FocusCoach
from src.agents.performance_analyst import PerformanceAnalyst
from src.agents.motivator import Motivator
from src.agents.study_planner import StudyPlanner
from src.agents.business_advisor import BusinessAdvisor


class AgentRouter:
    """Roteia requests para o agente especialista adequado."""

    def __init__(self) -> None:
        self._agents: dict[str, BaseAgent] = {
            "habit_coach": HabitCoach(),
            "reading_coach": ReadingCoach(),
            "bible_coach": BibleCoach(),
            "focus_coach": FocusCoach(),
            "performance_analyst": PerformanceAnalyst(),
            "motivator": Motivator(),
            "study_planner": StudyPlanner(),
            "business_advisor": BusinessAdvisor(),
        }

        self._routing_rules: dict[str, list[str]] = {
            "habit_question": ["habit_coach", "performance_analyst"],
            "reading_plan": ["reading_coach", "study_planner"],
            "bible_guidance": ["bible_coach"],
            "focus_optimization": ["focus_coach"],
            "performance_report": ["performance_analyst"],
            "motivation_needed": ["motivator"],
            "study_plan": ["study_planner", "reading_coach"],
            "business_help": ["business_advisor"],
            "general_chat": ["habit_coach", "reading_coach", "focus_coach"],
        }

    def route(self, request_type: str, context: Any) -> BaseAgent:
        """Seleciona o agente mais adequado."""
        candidates = self._routing_rules.get(request_type, ["habit_coach"])
        agent_name = candidates[0]
        return self._agents[agent_name]
