"""Statistics API routes."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.feedback import APIResponse
from app.schemas.stats import (
    DistributionData,
    OverviewData,
    TrendData,
)
from app.services.stats_service import StatsService

router = APIRouter(prefix="/stats", tags=["Statistics"])


@router.get("/overview", response_model=APIResponse)
async def get_overview(
    start_date: Optional[datetime] = Query(None, description="Start date"),
    end_date: Optional[datetime] = Query(None, description="End date"),
    city: Optional[str] = Query(None, description="City filter"),
    db: AsyncSession = Depends(get_db),
) -> APIResponse:
    """
    Get core statistics overview.

    Returns key metrics including total count, average rating,
    positive/negative rates, and pending count.
    """
    service = StatsService(db)
    overview = await service.get_overview(
        start_date=start_date,
        end_date=end_date,
        city=city,
    )

    return APIResponse(data=overview)


@router.get("/trend", response_model=APIResponse)
async def get_trend(
    granularity: str = Query(
        "daily", pattern="^(daily|weekly|monthly)$", description="Time granularity"
    ),
    start_date: Optional[datetime] = Query(None, description="Start date"),
    end_date: Optional[datetime] = Query(None, description="End date"),
    city: Optional[str] = Query(None, description="City filter"),
    db: AsyncSession = Depends(get_db),
) -> APIResponse:
    """
    Get trend data over time.

    Returns count and rating trends with specified granularity.
    """
    service = StatsService(db)
    trend = await service.get_trend(
        granularity=granularity,
        start_date=start_date,
        end_date=end_date,
        city=city,
    )

    return APIResponse(data=trend)


@router.get("/distribution", response_model=APIResponse)
async def get_distribution(
    start_date: Optional[datetime] = Query(None, description="Start date"),
    end_date: Optional[datetime] = Query(None, description="End date"),
    city: Optional[str] = Query(None, description="City filter"),
    db: AsyncSession = Depends(get_db),
) -> APIResponse:
    """
    Get distribution data across multiple dimensions.

    Returns distributions by city, route, feedback type, and hour.
    """
    service = StatsService(db)
    distribution = await service.get_distribution(
        start_date=start_date,
        end_date=end_date,
        city=city,
    )

    return APIResponse(data=distribution)
