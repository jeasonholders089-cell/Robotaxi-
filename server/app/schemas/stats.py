"""Pydantic schemas for Statistics API."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class OverviewData(BaseModel):
    """Schema for overview statistics."""

    total_count: int
    today_count: int
    avg_rating: float = Field(..., ge=0, le=5)
    positive_rate: float = Field(..., ge=0, le=1)
    negative_rate: float = Field(..., ge=0, le=1)
    pending_count: int
    trends: Optional["OverviewTrends"] = None


class OverviewTrends(BaseModel):
    """Schema for trend changes."""

    total_count_change: float
    avg_rating_change: float
    positive_rate_change: float


class RatingDistribution(BaseModel):
    """Schema for rating distribution."""

    rating: int
    count: int
    percentage: float = Field(..., ge=0, le=1)


class TrendDataPoint(BaseModel):
    """Schema for single trend data point."""

    date: str
    count: int
    rating_avg: float = Field(..., ge=0, le=5)


class TrendData(BaseModel):
    """Schema for trend data response."""

    count_trend: List[TrendDataPoint]
    rating_distribution: List[RatingDistribution]


class CityDistribution(BaseModel):
    """Schema for city distribution."""

    city: str
    count: int
    percentage: float = Field(..., ge=0, le=1)


class RouteDistribution(BaseModel):
    """Schema for route distribution."""

    route: str
    count: int
    negative_rate: float = Field(..., ge=0, le=1)


class TypeDistribution(BaseModel):
    """Schema for feedback type distribution."""

    type: str
    count: int
    percentage: float = Field(..., ge=0, le=1)


class HourDistribution(BaseModel):
    """Schema for hourly distribution."""

    hour: str
    count: int


class DistributionData(BaseModel):
    """Schema for distribution data response."""

    city_distribution: List[CityDistribution]
    route_distribution: List[RouteDistribution]
    type_distribution: List[TypeDistribution]
    hour_distribution: List[HourDistribution]


class AISummaryRequest(BaseModel):
    """Schema for AI summary request."""

    start_date: Optional[str] = None
    end_date: Optional[str] = None
    city: Optional[str] = None
    rating_min: Optional[int] = Field(default=None, ge=1, le=5)
    rating_max: Optional[int] = Field(default=None, ge=1, le=5)
    status: Optional[List[str]] = None
    feedback_type: Optional[List[str]] = None
    keyword: Optional[str] = None
    length: str = Field(default="medium", pattern="^(short|medium|long)$")
    max_count: int = Field(default=100, ge=1, le=1000)


class AISummaryResponse(BaseModel):
    """Schema for AI summary response."""

    summary: str
    generated_at: datetime
    analyzed_count: int


class AISuggestionItem(BaseModel):
    """Schema for single product suggestion."""

    priority: str
    category: str
    problem: str
    count: int
    percentage: float
    negative_rate: float
    user_voices: List[str]
    suggestions: List[str]


class AISuggestionsRequest(BaseModel):
    """Schema for AI suggestions request."""

    start_date: Optional[str] = None
    end_date: Optional[str] = None
    city: Optional[str] = None
    rating_min: Optional[int] = Field(default=None, ge=1, le=5)
    rating_max: Optional[int] = Field(default=None, ge=1, le=5)
    status: Optional[List[str]] = None
    feedback_type: Optional[List[str]] = None
    keyword: Optional[str] = None
    top_n: int = Field(default=3, ge=1, le=10)


class AISuggestionsResponse(BaseModel):
    """Schema for AI suggestions response."""

    suggestions: List[AISuggestionItem]
    type_distribution: Optional[List[TypeDistribution]] = None
    generated_at: datetime


# Update forward references
OverviewData.model_rebuild()
