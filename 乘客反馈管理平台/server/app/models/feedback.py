"""Feedback database model."""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Index, Integer, String, Text, func
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Feedback(Base):
    """Feedback model representing passenger feedback records."""

    __tablename__ = "feedback"

    # Primary key - format: FB+日期+序号
    id: Mapped[str] = mapped_column(String(20), primary_key=True)

    # Trip information
    trip_id: Mapped[str] = mapped_column(String(32), nullable=False)
    passenger_id: Mapped[str] = mapped_column(String(32), nullable=False)
    vehicle_id: Mapped[str] = mapped_column(String(32), nullable=False)

    # Location and route
    city: Mapped[str] = mapped_column(String(32), nullable=False)
    route: Mapped[str] = mapped_column(String(128), nullable=False)
    route_start: Mapped[str] = mapped_column(String(64), nullable=False)
    route_end: Mapped[str] = mapped_column(String(64), nullable=False)

    # Trip details
    trip_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    trip_duration: Mapped[int] = mapped_column(Integer, nullable=False)

    # Rating and feedback content
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    feedback_text: Mapped[str] = mapped_column(Text, nullable=False)

    # AI analysis results
    feedback_type: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    sentiment: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    keywords: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # Processing status
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )
    handler: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    handler_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    handled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Feedback channel
    feedback_channel: Mapped[str] = mapped_column(
        String(16), nullable=False, default="App"
    )

    # Reply information
    reply_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reply_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # Indexes for common queries
    __table_args__ = (
        Index("idx_trip_time", "trip_time"),
        Index("idx_rating", "rating"),
        Index("idx_city", "city"),
        Index("idx_status", "status"),
        Index("idx_created_at", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Feedback {self.id}>"
