"""AI analysis API routes."""

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.feedback import APIResponse
from app.schemas.stats import (
    AISummaryRequest,
    AISummaryResponse,
    AISuggestionsRequest,
    AISuggestionsResponse,
)
from app.services.ai_service import AIService, start_analysis_task
from app.services.analysis_task_store import get_task, sync_task_from_db, get_task_from_db

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


# ===== v1.5 Analysis Pipeline Endpoints =====


class AnalyzeRequest(BaseModel):
    """Request model for POST /api/ai/analyze."""

    start_date: Optional[str] = None
    end_date: Optional[str] = None
    city: Optional[str] = None
    rating_min: Optional[int] = None
    rating_max: Optional[int] = None
    status: Optional[List[str]] = None
    feedback_type: Optional[List[str]] = None
    keyword: Optional[str] = None


class AnalyzeResponse(BaseModel):
    """Response model for POST /api/ai/analyze."""

    task_id: str


class AnalyzeResultResponse(BaseModel):
    """Response model for GET /api/ai/analyze/{task_id}."""

    task_id: str
    status: str
    progress: int
    summary: Optional[str] = None
    problems: Optional[list] = None
    suggestions: Optional[list] = None
    analyzed_count: int = 0
    error: Optional[str] = None


@router.post("/analyze", response_model=APIResponse)
async def create_analysis_task(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks,
) -> APIResponse:
    """
    Start a new AI analysis task.

    Creates an analysis task based on FilterBar filter conditions.
    Returns task_id for polling the results.
    """
    # Build filters dict from request
    filters = {}
    if request.start_date:
        filters["start_date"] = request.start_date
    if request.end_date:
        filters["end_date"] = request.end_date
    if request.city:
        filters["city"] = request.city
    if request.rating_min is not None:
        filters["rating_min"] = request.rating_min
    if request.rating_max is not None:
        filters["rating_max"] = request.rating_max
    if request.status:
        filters["status"] = request.status
    if request.feedback_type:
        filters["feedback_type"] = request.feedback_type
    if request.keyword:
        filters["keyword"] = request.keyword

    # Create task and get task_id
    from app.services.ai_service import create_task
    task_id = create_task(filters)

    # Add background task
    from app.database import get_db_context
    from app.services.ai_service import run_analysis_task

    async def background_analysis():
        async with get_db_context() as db:
            await run_analysis_task(task_id, filters, db)

    background_tasks.add_task(background_analysis)

    return APIResponse(data=AnalyzeResponse(task_id=task_id))


@router.post("/analyze-debug", response_model=APIResponse)
async def analyze_debug(
    request: AnalyzeRequest,
    db: AsyncSession = Depends(get_db),
) -> APIResponse:
    """Debug endpoint - execute analysis synchronously."""
    # Build filters dict from request
    filters = {}
    if request.start_date:
        filters["start_date"] = request.start_date
    if request.end_date:
        filters["end_date"] = request.end_date
    if request.city:
        filters["city"] = request.city
    if request.rating_min is not None:
        filters["rating_min"] = request.rating_min
    if request.rating_max is not None:
        filters["rating_max"] = request.rating_max
    if request.status:
        filters["status"] = request.status
    if request.feedback_type:
        filters["feedback_type"] = request.feedback_type
    if request.keyword:
        filters["keyword"] = request.keyword

    # Run analysis synchronously for debugging
    from app.services.ai_service import run_analysis_task
    from app.database import get_db_context

    try:
        await run_analysis_task("debug", filters, get_db_context)
        task = await get_db_context().__aenter__()
        return APIResponse(data={"status": "ok"})
    except Exception as e:
        import traceback
        return APIResponse(data={"error": str(e), "trace": traceback.format_exc()})


@router.get("/analyze/{task_id}", response_model=APIResponse)
async def get_analysis_result(
    task_id: str,
    db: AsyncSession = Depends(get_db),
) -> APIResponse:
    """
    Get AI analysis task result.

    Returns the analysis result including summary, problems, and suggestions.
    First checks in-memory store, then falls back to database.
    """
    task = get_task(task_id)

    # If not in memory, try loading from database
    if not task:
        sync_task_from_db(task_id)
        task = get_task(task_id)

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return APIResponse(
        data=AnalyzeResultResponse(
            task_id=task.task_id,
            status=task.status,
            progress=task.progress,
            summary=task.summary,
            problems=task.problems,
            suggestions=task.suggestions,
            analyzed_count=task.analyzed_count,
            error=task.error,
        )
    )
