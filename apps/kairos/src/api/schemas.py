"""
Schemas Pydantic para validação de entrada/saída da API do Kairos.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Request para conversa com Kairos."""

    user_id: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    context: dict = Field(default_factory=dict)


class ChatResponse(BaseModel):
    """Resposta do Kairos."""

    content: str
    agent: str
    metadata: dict = Field(default_factory=dict)


class InsightRequest(BaseModel):
    """Request para insights."""

    user_id: str = Field(..., min_length=1)
    context: dict = Field(default_factory=dict)


class RecommendationRequest(BaseModel):
    """Request para recomendações."""

    user_id: str = Field(..., min_length=1)
    context: dict = Field(default_factory=dict)
