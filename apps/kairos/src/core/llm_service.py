"""
LLMService — Camada de chamada ao LLM (Ollama).

Centraliza a comunicação com o Ollama via REST API.
Trata timeout, erros de conexão e loga prompts/respostas (sem expor JWT).
"""

from __future__ import annotations

import logging

import httpx

from src.config import settings

logger = logging.getLogger("kairos")


class LLMService:
    """Serviço de chamada ao LLM via Ollama."""

    def __init__(self) -> None:
        self._base_url = settings.ollama_base_url
        self._model = settings.default_model
        self._timeout = 300.0

    async def generate(self, system: str, user_input: str) -> str:
        """Chama o Ollama e retorna o texto gerado.

        Args:
            system: System prompt completo (com contexto do usuário).
            user_input: Mensagem do usuário.

        Returns:
            Texto gerado pelo LLM ou mensagem de fallback.
        """
        logger.info("[LLM] System prompt:\n%s", system)
        logger.info("[LLM] User input: %s", user_input)

        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user_input},
            ],
            "stream": False,
            "options": {
                "num_predict": 500,
                "temperature": 0.7,
                "top_p": 0.9,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(
                    f"{self._base_url}/api/chat",
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                content = data["message"]["content"]
                logger.info("[LLM] Response: %s", content)
                return content

        except httpx.TimeoutException:
            logger.error("[LLM] Timeout (%ss) ao chamar Ollama", self._timeout)
            return (
                "O serviço de IA demorou muito para responder. "
                "Tente novamente."
            )
        except httpx.ConnectError:
            logger.error("[LLM] Não foi possível conectar ao Ollama em %s", self._base_url)
            return (
                "Não consegui conectar ao serviço de IA. "
                "Verifique se o Ollama está rodando e tente novamente."
            )
        except Exception as exc:
            logger.error("[LLM] Erro inesperado: %s", exc)
            return "Ocorreu um erro ao processar sua mensagem. Tente novamente."
