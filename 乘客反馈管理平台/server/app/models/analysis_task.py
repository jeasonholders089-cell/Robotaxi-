"""Analysis task result database model."""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Index, Integer, String, Text, func
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AnalysisTaskResult(Base):
    """Persisted AI analysis task results."""

    __tablename__ = "analysis_task_result"

    # Primary key - task_id from the task store
    task_id: Mapped[str] = mapped_column(String(64), primary_key=True)

    # Task metadata
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Filters used for the analysis
    filters: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Results
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    problems: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    suggestions: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    analyzed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Error information
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # Index for querying
    __table_args__ = (Index("idx_created_at", "created_at"),)

    def __repr__(self) -> str:
        return f"<AnalysisTaskResult {self.task_id}>"