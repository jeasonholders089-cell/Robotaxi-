"""AI analysis API routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.feedback import APIResponse
from app.schemas.stats import (
    AISummaryRequest,
    AISummaryResponse,
    AISuggestionsRequest,
    AISuggestionsResponse,
)
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["AI Analysis"])


@router.post("/classify", response_model=APIResponse)
async def classify_feedbacks(
    ids: list[str],
    db: AsyncSession = Depends(get_db),
) -> APIResponse:
    """
    Batch classify feedbacks using AI.

    Processes multiple feedbacks and updates their classification results.
    """
    if len(ids) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 feedbacks per request")

    service = AIService(db)
    result = await service.classify_batch(ids)

    return APIResponse(
        data={
            "success_count": len(result["results"]),
            "failed_count": len(result["failed_ids"]),
            "results": result["results"],
            "failed_ids": result["failed_ids"],
        }
    )


@router.post("/summary", response_model=APIResponse)
async def generate_summary(
    request: AISummaryRequest,
    db: AsyncSession = Depends(get_db),
) -> APIResponse:
    """
    Generate AI summary for feedback data.

    Creates a concise summary based on feedback samples and statistics.
    """
    service = AIService(db)
    summary = await service.generate_summary(request)

    return APIResponse(data=summary)


@router.post("/suggestions", response_model=APIResponse)
async def generate_suggestions(
    request: AISuggestionsRequest,
    db: AsyncSession = Depends(get_db),
) -> APIResponse:
    """
    Generate product improvement suggestions.

    Analyzes feedback to produce actionable improvement recommendations.
    """
    service = AIService(db)
    suggestions = await service.generate_suggestions(request)

    return APIResponse(data=suggestions)
