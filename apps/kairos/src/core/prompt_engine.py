"""
PromptEngine — Centralização de prompts do Kairos.

Gerencia system prompts e user prompts para todos os agentes.
Substitui strings inline espalhadas nos arquivos de agentes.
"""

from __future__ import annotations

from typing import Any

from src.core.context_manager import UserContext


class PromptEngine:
    """Centraliza templates de prompt para todos os agentes do Kairos."""

    _BASE_TEMPLATE = (
        "Você é o Kairos, assistente pessoal do DisciplinaApp. "
        "Tom: {personality}. "
        "Seja objetivo e prático. Responda em no máximo 3 parágrafos."
    )

    _AGENT_PROMPTS: dict[str, str] = {
        "habit_coach": (
            "\nVocê é especialista em hábitos e consistência."
            "\nHábitos do usuário: {habits}"
            "\nMetas do usuário: {goals}"
            "\nStreaks do usuário: {streaks}"
        ),
        "reading_coach": (
            "\nVocê é especialista em leitura e hábitos de leitura."
            "\nLivros do usuário: {books}"
        ),
        "bible_coach": (
            "\nVocê é especialista em leitura bíblica e disciplina espiritual."
            "\nLeitura bíblica do usuário: {bible}"
        ),
        "focus_coach": (
            "\nVocê é especialista em foco, produtividade e técnica Pomodoro."
            "\nSessões Pomodoro do usuário: {pomodoro}"
        ),
        "performance_analyst": (
            "\nVocê é um analista de desempenho. Cruza dados de hábitos, "
            "leitura, foco e consistência."
            "\nAtividade recente: {recent_activity}"
            "\nMetas: {goals}"
        ),
        "motivator": (
            "\nSua função é motivar. Detecta quedas de consistência e gera "
            "gatilhos de ânimo."
            "\nStreaks: {streaks}"
        ),
        "study_planner": (
            "\nVocê é um planejador de estudos. Cria cronogramas realistas "
            "baseados no perfil do usuário."
            "\nMetas atuais: {goals}"
        ),
        "business_advisor": (
            "\nVocê é um consultor de negócios. Ajuda com precificação, "
            "vendas, marketing, atendimento e gestão."
        ),
    }

    def get_system_prompt(
        self, agent_name: str, context: UserContext
    ) -> str:
        """Constrói o system prompt completo para um agente.

        Args:
            agent_name: Nome do agente (ex: "habit_coach").
            context: Contexto do usuário com dados para formatação.

        Returns:
            System prompt formatado com dados do contexto.
        """
        personality = context.preferences.get("personality", "encorajador")
        base = self._BASE_TEMPLATE.format(personality=personality)

        agent_specific = self._AGENT_PROMPTS.get(agent_name, "")
        if agent_specific:
            recent = context.recent_activity
            agent_specific = agent_specific.format(
                streaks=context.streaks,
                habits=context.habits,
                recent_activity=context.recent_activity,
                goals=context.goals,
                books=recent.get("books", []),
                bible=recent.get("bible", {}),
                pomodoro=recent.get("pomodoro", {}),
            )

        # Histórico de conversa fica apenas no user_prompt (get_user_prompt),
        # evitando duplicação entre system e user.
        return base + agent_specific

    def get_user_prompt(
        self, message: str, context: UserContext
    ) -> str:
        """Constrói o user prompt com contexto de conversa.

        Args:
            message: Mensagem do usuário.
            context: Contexto com histórico de conversa.

        Returns:
            User prompt formatado com histórico se disponível.
        """
        parts: list[str] = [message]

        if context.conversation_history:
            parts.append("\n--- Histórico recente ---")
            for entry in context.conversation_history:
                agent_response = self._truncate_words(
                    entry['agent_response'], max_words=50
                )
                parts.append(
                    f"Usuário: {entry['user_message']}"
                    f"\nKairos: {agent_response}"
                )

        return "\n".join(parts)

    @staticmethod
    def _truncate_words(text: str, max_words: int = 50) -> str:
        """Trunca texto por número de palavras, evitando cortar frases no meio."""
        words = text.split()
        if len(words) <= max_words:
            return text
        return " ".join(words[:max_words]) + "..."
