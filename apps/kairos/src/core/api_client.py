"""
APIClient — Cliente HTTP para chamar a API NestJS.

Faz chamadas autenticadas (Bearer JWT) aos endpoints da API.
Degrada graciosamente: retorna {} em caso de falha.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from src.config import settings

logger = logging.getLogger("kairos")


class APIClient:
    """Cliente HTTP para a API do DisciplinaApp."""

    def __init__(self) -> None:
        self._base_url = settings.api_base_url
        self._timeout = 5.0

    async def get_user_context(self, token: str) -> dict[str, Any]:
        """Busca o contexto completo do usuário via endpoint agregado.

        Args:
            token: Token JWT completo (ex: "Bearer eyJxxx...").

        Returns:
            JSON com profile, habits, streaks, goals, books, bible, pomodoro.
            Retorna {} em caso de erro ou token vazio.
        """
        if not token:
            logger.warning("[APIClient] Token vazio — contexto será vazio")
            return {}

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(
                    f"{self._base_url}/api/kairos/context",
                    headers={"Authorization": token},
                )
                response.raise_for_status()
                data = response.json()
                logger.info("[APIClient] Contexto carregado: %d habitos, %d metas, %d streaks",
                            len(data.get("habits", [])),
                            len(data.get("goals", [])),
                            len(data.get("streaks", [])))
                return data

        except httpx.TimeoutException:
            logger.error("[APIClient] Timeout ao buscar contexto da API")
            return {}
        except httpx.ConnectError:
            logger.error("[APIClient] API NestJS indisponível em %s", self._base_url)
            return {}
        except httpx.HTTPStatusError as exc:
            logger.error("[APIClient] Erro HTTP %d: %s", exc.response.status_code, exc.response.text)
            return {}
        except Exception as exc:
            logger.error("[APIClient] Erro inesperado: %s", exc)
            return {}
