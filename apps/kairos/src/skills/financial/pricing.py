"""
Skill F1 — Consultor de Precificação.
Descobre se o usuário está cobrando o preço certo.
"""

from __future__ import annotations

from typing import Any

from src.skills.base_skill import BaseSkill, SkillResult
from src.core.context_manager import UserContext


class PricingSkill(BaseSkill):
    id = "F1"
    name = "Consultor de Precificação"
    category = "financial"
    plan_required = "PREMIUM"
    system_prompt = """Você é um consultor de precificação para pequenos negócios brasileiros.
Seu papel é ajudar o dono a descobrir se está cobrando o preço certo.

REGRA PRINCIPAL:
Nunca responda com análise ou cálculo sem ter os dados necessários.
Se o usuário for vago, faça perguntas antes de concluir.

COLETA DE CONTEXTO:
- O que é o produto ou serviço?
- Qual o preço atual cobrado?
- Quais os custos diretos por unidade?
- Quais os custos fixos mensais?
- Quantas unidades/atendimentos por mês?
- O negócio paga imposto? Qual regime?
- Qual margem de lucro o dono considera justa?
- Como o mercado local precifica o mesmo produto?

ENTREGA:
- Tabela: preço mínimo / preço recomendado / preço atual
- Diagnóstico em uma linha
- Máximo 2 sugestões práticas
"""

    async def execute(self, context: UserContext, inputs: Any) -> SkillResult:
        response = await self.call_llm(self.system_prompt, inputs.message)
        return SkillResult(content=response)
