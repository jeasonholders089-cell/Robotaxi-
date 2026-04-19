"""Feedback management API routes."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.feedback import (
    APIResponse,
    FeedbackBatchUpdateRequest,
    FeedbackBatchUpdateResponse,
    FeedbackClassifyRequest,
    FeedbackClassifyResponse,
    FeedbackCreate,
    FeedbackExportRequest,
    FeedbackListResponse,
    FeedbackResponse,
    FeedbackUpdate,
)
from app.services.feedback_service import FeedbackService
from app.utils.ai_client import get_kimi_client

router = APIRouter(prefix="/feedbacks", tags=["Feedback"])


# Allowed sort fields for validation
ALLOWED_SORT_FIELDS = {"trip_time", "rating", "created_at", "updated_at", "city", "status"}


@router.get("", response_model=APIResponse)
async def get_feedback_list(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(15, ge=1, le=100, description="Page size"),
    sort_by: str = Query("trip_time", description="Sort field"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Sort order"),
    city: Optional[str] = Query(None, description="City filter"),
    route: Optional[str] = Query(None, description="Route filter"),
    rating_min: Optional[int] = Query(None, ge=1, le=5, description="Minimum rating"),
    rating_max: Optional[int] = Query(None, ge=1, le=5, description="Maximum rating"),
    start_date: Optional[datetime] = Query(None, description="Start date"),
    end_date: Optional[datetime] = Query(None, description="End date"),
    status: Optional[str] = Query(None, description="Status filter"),
    keyword: Optional[str] = Query(None, description="Keyword search"),
    feedback_type: Optional[str] = Query(None, description="Feedback type filter"),
    db: AsyncSession = Depends(get_db),
) -> APIResponse:
    """
    Get paginated list of feedbacks with filters.

    Returns paginated feedback list sorted by specified field.
    """
    # Validate sort_by field to prevent SQL errors
    if sort_by not in ALLOWED_SORT_FIELDS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid sort_by field. Allowed fields: {', '.join(sorted(ALLOWED_SORT_FIELDS))}"
        )

    service = FeedbackService(db)

    feedbacks, total = await service.get_list(
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        city=city,
        route=route,
        rating_min=rating_min,
        rating_max=rating_max,
        start_date=start_date,
        end_date=end_date,
        status=status,
        keyword=keyword,
        feedback_type=feedback_type,
    )

    return APIResponse(
        data=FeedbackListResponse(
            total=total,
            page=page,
            page_size=page_size,
            list=feedbacks,
        )
    )


@router.get("/{feedback_id}", response_model=APIResponse)
async def get_feedback_detail(
    feedback_id: str,
    db: AsyncSession = Depends(get_db),
) -> APIResponse:
    """
    Get single feedback detail by ID.

    Returns full feedback information including AI analysis results.
    """
    service = FeedbackService(db)
    feedback = await service.get_by_id(feedback_id)

    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")

    # Convert to response
    response = FeedbackResponse(
        id=feedback.id,
        trip_id=feedback.trip_id,
        passenger_id=feedback.passenger_id,
        vehicle_id=feedback.vehicle_id,
        city=feedback.city,
        route=feedback.route,
        route_start=feedback.route_start,
        route_end=feedback.route_end,
        trip_time=feedback.trip_time,
        trip_duration=feedback.trip_duration,
        rating=feedback.rating,
        feedback_text=feedback.feedback_text,
        feedback_pictures=feedback.feedback_pictures,
        feedback_videos=feedback.feedback_videos,
        feedback_type=feedback.feedback_type,
        sentiment=feedback.sentiment,
        keywords=feedback.keywords,
        status=feedback.status,
        handler=feedback.handler,
        handler_notes=feedback.handler_notes,
        handled_at=feedback.handled_at,
        ai_summary=feedback.ai_summary,
        feedback_channel=feedback.feedback_channel,
        reply_text=feedback.reply_text,
        reply_time=feedback.reply_time,
        created_at=feedback.created_at,
        updated_at=feedback.updated_at,
    )

    return APIResponse(data=response)


@router.patch("/{feedback_id}", response_model=APIResponse)
async def update_feedback(
    feedback_id: str,
    data: FeedbackUpdate,
    db: AsyncSession = Depends(get_db),
) -> APIResponse:
    """
    Update feedback status, handler, or notes.

    Allows partial update of feedback fields.
    """
    service = FeedbackService(db)
    feedback = await service.update(feedback_id, data)

    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")

    return APIResponse(data={"id": feedback.id, "updated": True})


@router.post("", response_model=APIResponse)
async def create_feedback(
    data: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
) -> APIResponse:
    """
    Create new feedback.

    Auto-generates feedback ID and sets initial status to pending.
    """
    service = FeedbackService(db)
    feedback = await service.create(data)

    return APIResponse(data={"id": feedback.id, "created": True})


@router.post("/batch-update", response_model=APIResponse)
async def batch_update_feedback(
    request: FeedbackBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
) -> APIResponse:
    """
    Batch update feedback status or handler.

    Updates multiple feedbacks at once.
    """
    service = FeedbackService(db)
    result = await service.batch_update(request)

    return APIResponse(data=result)


@router.post("/batch-classify", response_model=APIResponse)
async def batch_classify_feedback(
    request: FeedbackClassifyRequest,
    db: AsyncSession = Depends(get_db),
) -> APIResponse:
    """
    Batch classify feedbacks using AI.

    Processes multiple feedbacks through AI classification.
    """
    service = FeedbackService(db)

    # Create classify function
    async def classify_func(text: str):
        client = get_kimi_client()
        return await client.classify(
            text,
            [
                "行驶体验",
                "车内环境",
                "接驾体验",
                "路线规划",
                "安全感受",
                "服务态度",
                "其他",
            ],
        )

    result = await service.batch_classify(request.ids, classify_func)

    return APIResponse(data=result)


@router.post("/batch-export")
async def batch_export_feedback(
    request: FeedbackExportRequest,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """
    Export feedbacks to Excel or CSV file.

    Returns file download with specified format.
    """
    import logging
    logger = logging.getLogger(__name__)

    service = FeedbackService(db)

    try:
        # Get export data
        data = await service.export_data(
            ids=request.ids,
            city=request.city,
            route=request.route,
            rating_min=request.rating_min,
            rating_max=request.rating_max,
            start_date=request.start_date,
            end_date=request.end_date,
            status=request.status,
            keyword=request.keyword,
        )
        logger.info(f"Export request: ids={request.ids}, format={request.format}, filters={ {k: v for k, v in request.model_dump().items() if k not in ('ids', 'format')} }, data_count={len(data) if data else 0}")
    except Exception as e:
        logger.error(f"Export data query failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Export query failed: {str(e)}")

    if not data:
        raise HTTPException(status_code=404, detail="No data to export")

    try:
        if request.format == "csv":
            return await _export_csv(data)
        else:
            return await _export_excel(data)
    except Exception as e:
        logger.error(f"Export file generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Export file generation failed: {str(e)}")


async def _export_csv(data: list) -> Response:
    """Export data to CSV format."""
    import csv
    import io

    output = io.StringIO()
    if data:
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=feedbacks_export.csv"
        },
    )


async def _export_excel(data: list) -> Response:
    """Export data to Excel format."""
    import io
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active

    if data:
        # Write headers
        ws.append(list(data[0].keys()))

        # Write data rows
        for row in data:
            ws.append(list(row.values()))

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=feedbacks_export.xlsx"
        },
    )
