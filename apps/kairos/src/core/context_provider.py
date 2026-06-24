"""
ContextProvider — Abstração de fonte de contexto do usuário.

Permite que o ContextManager obtenha dados de diferentes fontes
sem acoplamento direto com a implementação.

Implementação atual: ApiContextProvider (chama endpoint agregado da API NestJS).
Futuro: GraphContextProvider, MemoryContextProvider, HybridContextProvider.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any

from src.core.api_client import APIClient

logger = logging.getLogger("kairos")


class ContextProvider(ABC):
    """Interface para provedores de contexto do usuário."""

    @abstractmethod
    async def get_context(self, user_id: str, token: str) -> dict[str, Any]:
        """Retorna o contexto agregado do usuário.

        Args:
            user_id: ID do usuário.
            token: Token JWT completo para autenticação.

        Returns:
            Dicionário com dados do usuário ou {} em caso de falha.
        """
        ...


class ApiContextProvider(ContextProvider):
    """Provedor que busca contexto via endpoint agregado da API NestJS."""

    def __init__(self, api_client: APIClient | None = None) -> None:
        self._api_client = api_client or APIClient()

    async def get_context(self, user_id: str, token: str) -> dict[str, Any]:
        """Busca contexto via GET /api/kairos/context.

        Args:
            user_id: ID do usuário (reservado para log/futuro).
            token: Token JWT completo.

        Returns:
            JSON agregado ou {} em caso de falha.
        """
        logger.info("[ContextProvider] Buscando contexto para user_id=%s", user_id)
        return await self._api_client.get_user_context(token)
