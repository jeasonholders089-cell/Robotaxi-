"""Pydantic schemas for Feedback API."""

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field, field_validator


class FeedbackCreate(BaseModel):
    """Schema for creating a new feedback."""

    trip_id: str = Field(..., min_length=1, max_length=32)
    passenger_id: str = Field(..., min_length=1, max_length=32)
    vehicle_id: str = Field(..., min_length=1, max_length=32)
    city: str = Field(..., min_length=1, max_length=32)
    route: str = Field(..., min_length=1, max_length=128)
    route_start: str = Field(..., min_length=1, max_length=64)
    route_end: str = Field(..., min_length=1, max_length=64)
    trip_time: datetime
    trip_duration: int = Field(..., ge=0)
    rating: int = Field(..., ge=1, le=5)
    feedback_text: str = Field(..., min_length=1)
    feedback_type: Optional[List[str]] = None
    sentiment: Optional[str] = None
    keywords: Optional[List[str]] = None
    feedback_channel: str = Field(default="App", max_length=16)


class FeedbackUpdate(BaseModel):
    """Schema for updating a feedback."""

    status: Optional[str] = Field(
        None,
        pattern="^(pending|processing|resolved|closed)$",
    )
    handler: Optional[str] = Field(None, max_length=64)
    handler_notes: Optional[str] = None
    feedback_type: Optional[List[str]] = None
    sentiment: Optional[str] = None
    keywords: Optional[List[str]] = None
    ai_summary: Optional[str] = None
    reply_text: Optional[str] = None


class FeedbackResponse(BaseModel):
    """Schema for feedback response."""

    id: str
    trip_id: str
    passenger_id: str
    vehicle_id: str
    city: str
    route: str
    route_start: str
    route_end: str
    trip_time: datetime
    trip_duration: int
    rating: int
    feedback_text: str
    feedback_pictures: Optional[List[str]] = None
    feedback_videos: Optional[List[str]] = None
    feedback_type: Optional[List[str]] = None
    sentiment: Optional[str] = None
    keywords: Optional[List[str]] = None
    status: str
    handler: Optional[str] = None
    handler_notes: Optional[str] = None
    handled_at: Optional[datetime] = None
    ai_summary: Optional[str] = None
    feedback_channel: str
    reply_text: Optional[str] = None
    reply_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FeedbackSummary(BaseModel):
    """Schema for feedback summary in list view."""

    id: str
    trip_id: str
    passenger_id: str
    vehicle_id: str
    city: str
    route: str
    trip_time: datetime
    trip_duration: int
    rating: int
    feedback_text: str
    feedback_pictures: Optional[List[str]] = None
    feedback_videos: Optional[List[str]] = None
    feedback_type: Optional[List[str]] = None
    sentiment: Optional[str] = None
    keywords: Optional[List[str]] = None
    status: str
    handler: Optional[str] = None
    handler_notes: Optional[str] = None
    handled_at: Optional[datetime] = None
    ai_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FeedbackListResponse(BaseModel):
    """Schema for paginated feedback list response."""

    total: int
    page: int
    page_size: int
    list: List[FeedbackSummary]


class FeedbackBatchUpdateRequest(BaseModel):
    """Schema for batch update request."""

    ids: List[str] = Field(..., min_length=1, max_length=1000)
    status: Optional[str] = Field(
        None,
        pattern="^(pending|processing|resolved|closed)$",
    )
    handler: Optional[str] = Field(None, max_length=64)


class FeedbackBatchUpdateResponse(BaseModel):
    """Schema for batch update response."""

    success_count: int
    failed_count: int
    failed_ids: List[str] = []


class FeedbackExportRequest(BaseModel):
    """Schema for export request."""

    ids: Optional[List[str]] = None
    format: str = Field(default="excel", pattern="^(excel|csv)$")
    # Filter parameters for export all
    city: Optional[str] = None
    route: Optional[str] = None
    rating_min: Optional[int] = Field(None, ge=1, le=5)
    rating_max: Optional[int] = Field(None, ge=1, le=5)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None
    keyword: Optional[str] = None
    feedback_type: Optional[str] = None


class FeedbackClassifyRequest(BaseModel):
    """Schema for AI classification request."""

    ids: List[str] = Field(..., min_length=1, max_length=100)


class FeedbackClassifyResult(BaseModel):
    """Schema for single classification result."""

    id: str
    feedback_type: List[str]
    sentiment: str
    keywords: List[str]


class FeedbackClassifyResponse(BaseModel):
    """Schema for batch classification response."""

    success_count: int
    failed_count: int
    results: List[FeedbackClassifyResult]
    failed_ids: List[str] = []


class APIResponse(BaseModel):
    """Standard API response wrapper."""

    code: int = 0
    message: str = "success"
    data: Any = None
