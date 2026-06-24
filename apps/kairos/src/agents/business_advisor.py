"""
BusinessAdvisor — Consultor de negócios (24 skills).

Hereda as 24 skills do "Claude para Pequenos Negócios" e as orquestra
como capacidades do Kairos para usuários Premium/Business.

Skills são carregadas dinamicamente (lazy import) para evitar
imports de módulos que ainda não foram criados.
"""

from __future__ import annotations

import importlib
from typing import Any

from src.agents.base_agent import BaseAgent, AgentResult
from src.core.context_manager import UserContext

# Mapeamento: skill_id -> (módulo, classe)
SKILL_REGISTRY: dict[str, tuple[str, str]] = {
    "F1": ("src.skills.financial.pricing", "PricingSkill"),
    "F2": ("src.skills.financial.cashflow", "CashflowSkill"),
    "F3": ("src.skills.financial.education", "EducationSkill"),
    "F4": ("src.skills.financial.goals", "GoalsSkill"),
    "C1": ("src.skills.commercial.proposal", "ProposalSkill"),
    "C2": ("src.skills.commercial.sales_script", "SalesScriptSkill"),
    "C3": ("src.skills.commercial.followup", "FollowupSkill"),
    "C4": ("src.skills.commercial.icp", "ICPSkill"),
    "V1": ("src.skills.sales.lead_qualify", "LeadQualifySkill"),
    "V2": ("src.skills.sales.objections", "ObjectionsSkill"),
    "V3": ("src.skills.sales.reactivate", "ReactivateSkill"),
    "V4": ("src.skills.sales.profiles", "ProfilesSkill"),
    "M1": ("src.skills.marketing.calendar", "CalendarSkill"),
    "M2": ("src.skills.marketing.copywriting", "CopywritingSkill"),
    "M3": ("src.skills.marketing.video_script", "VideoScriptSkill"),
    "M4": ("src.skills.marketing.campaign_analysis", "CampaignAnalysisSkill"),
    "A1": ("src.skills.support.whatsapp_script", "WhatsAppScriptSkill"),
    "A2": ("src.skills.support.review_response", "ReviewResponseSkill"),
    "A3": ("src.skills.support.faq", "FAQSkill"),
    "A4": ("src.skills.support.scheduling", "SchedulingSkill"),
    "G1": ("src.skills.management.weekly_routine", "WeeklyRoutineSkill"),
    "G2": ("src.skills.management.checklist", "ChecklistSkill"),
    "G3": ("src.skills.management.meeting", "MeetingSkill"),
    "G4": ("src.skills.management.delegation", "DelegationSkill"),
}


class BusinessAdvisor(BaseAgent):
    name = "business_advisor"
    description = "Consultor de negócios com 24 skills especializadas"

    def __init__(self) -> None:
        super().__init__()
        self._loaded_skills: dict[str, Any] = {}

    def _load_skill(self, skill_id: str) -> Any | None:
        """Carrega uma skill sob demanda (lazy import)."""
        if skill_id in self._loaded_skills:
            return self._loaded_skills[skill_id]

        registry_entry = SKILL_REGISTRY.get(skill_id)
        if not registry_entry:
            return None

        module_path, class_name = registry_entry
        try:
            module = importlib.import_module(module_path)
            skill_class = getattr(module, class_name)
            skill_instance = skill_class()
            self._loaded_skills[skill_id] = skill_instance
            return skill_instance
        except (ImportError, AttributeError):
            return None

    async def execute(
        self, context: UserContext, request: Any
    ) -> AgentResult:
        skill_id = getattr(request, "skill_id", None)

        if skill_id:
            skill = self._load_skill(skill_id)
            if skill:
                result = await skill.execute(context, request)
                return AgentResult(
                    content=result.content, metadata={"skill": skill_id}
                )

        # Sem skill específica ou skill não implementada: roteamento geral
        system = self.build_system_prompt(context)
        user_prompt = self._prompt_engine.get_user_prompt(
            request.message, context
        )
        response = await self.call_llm(system, user_prompt)
        return AgentResult(content=response)
