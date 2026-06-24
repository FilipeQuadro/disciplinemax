"""
FastAPI app — Entry point HTTP do Kairos.

Endpoints mínimos para que o serviço inicie e responda.
Integra com o AIOrchestrator existente.
"""

from __future__ import annotations

from fastapi import FastAPI

from src.api.schemas import ChatRequest, ChatResponse, InsightRequest, RecommendationRequest
from src.core.orchestrator import AIOrchestrator, KairosRequest

app = FastAPI(title="Kairos", description="IA nativa do DisciplinaApp")
_orchestrator = AIOrchestrator()


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "kairos"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    kairos_request = KairosRequest(
        user_id=request.user_id,
        type=request.type,
        message=request.message,
        context=request.context,
    )
    result = await _orchestrator.process(kairos_request)
    return ChatResponse(
        content=result.content,
        agent=result.agent,
        metadata=result.metadata,
    )


@app.post("/api/insights", response_model=ChatResponse)
async def insights(request: InsightRequest) -> ChatResponse:
    kairos_request = KairosRequest(
        user_id=request.user_id,
        type="performance_report",
        message="Gerar insights de desempenho",
        context=request.context,
    )
    result = await _orchestrator.process(kairos_request)
    return ChatResponse(
        content=result.content,
        agent=result.agent,
        metadata=result.metadata,
    )


@app.post("/api/recommendations", response_model=ChatResponse)
async def recommendations(request: RecommendationRequest) -> ChatResponse:
    kairos_request = KairosRequest(
        user_id=request.user_id,
        type="reading_plan",
        message="Gerar recomendações",
        context=request.context,
    )
    result = await _orchestrator.process(kairos_request)
    return ChatResponse(
        content=result.content,
        agent=result.agent,
        metadata=result.metadata,
    )
