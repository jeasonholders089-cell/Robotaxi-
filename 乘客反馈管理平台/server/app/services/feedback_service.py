"""Feedback business logic service."""

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.feedback import Feedback
from app.schemas.feedback import (
    FeedbackBatchUpdateRequest,
    FeedbackBatchUpdateResponse,
    FeedbackClassifyResponse,
    FeedbackClassifyResult,
    FeedbackCreate,
    FeedbackListResponse,
    FeedbackSummary,
    FeedbackUpdate,
)


class FeedbackService:
    """Service for managing feedback data and operations."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db

    async def get_list(
        self,
        page: int = 1,
        page_size: int = 15,
        sort_by: str = "trip_time",
        sort_order: str = "desc",
        city: Optional[str] = None,
        route: Optional[str] = None,
        rating_min: Optional[int] = None,
        rating_max: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[str] = None,
        keyword: Optional[str] = None,
        feedback_type: Optional[str] = None,
    ) -> Tuple[List[FeedbackSummary], int]:
        """
        Get paginated feedback list with filters.

        Returns:
            Tuple of (list of feedback summaries, total count)
        """
        # Build query conditions
        conditions = []

        if city:
            conditions.append(Feedback.city == city)
        if route:
            conditions.append(Feedback.route.like(f"%{route}%"))
        if rating_min is not None:
            conditions.append(Feedback.rating >= rating_min)
        if rating_max is not None:
            conditions.append(Feedback.rating <= rating_max)
        if start_date:
            conditions.append(Feedback.trip_time >= start_date)
        if end_date:
            conditions.append(Feedback.trip_time <= end_date)
        if status:
            conditions.append(Feedback.status == status)
        if keyword:
            conditions.append(Feedback.feedback_text.like(f"%{keyword}%"))

        # Build base query
        query = select(Feedback)
        count_query = select(func.count(Feedback.id))

        if conditions:
            query = query.where(and_(*conditions))
            count_query = count_query.where(and_(*conditions))

        # Get total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply sorting
        sort_column = getattr(Feedback, sort_by, Feedback.trip_time)
        if sort_order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        # Execute query
        result = await self.db.execute(query)
        feedbacks = result.scalars().all()

        # Convert to response models
        summaries = [
            FeedbackSummary(
                id=fb.id,
                trip_id=fb.trip_id,
                passenger_id=self._mask_passenger_id(fb.passenger_id),
                vehicle_id=fb.vehicle_id,
                city=fb.city,
                route=f"{fb.route_start} → {fb.route_end}",
                trip_time=fb.trip_time,
                trip_duration=fb.trip_duration,
                rating=fb.rating,
                feedback_text=fb.feedback_text[:100] + "..."
                if len(fb.feedback_text) > 100
                else fb.feedback_text,
                feedback_type=fb.feedback_type,
                sentiment=fb.sentiment,
                keywords=fb.keywords,
                status=fb.status,
                handler=fb.handler,
                handler_notes=fb.handler_notes,
                handled_at=fb.handled_at,
                ai_summary=fb.ai_summary,
                created_at=fb.created_at,
                updated_at=fb.updated_at,
            )
            for fb in feedbacks
        ]

        return summaries, total

    async def get_by_id(self, feedback_id: str) -> Optional[Feedback]:
        """
        Get single feedback by ID.

        Args:
            feedback_id: The feedback ID

        Returns:
            Feedback object or None if not found
        """
        result = await self.db.execute(
            select(Feedback).where(Feedback.id == feedback_id)
        )
        return result.scalar_one_or_none()

    async def create(self, data: FeedbackCreate) -> Feedback:
        """
        Create new feedback.

        Args:
            data: Feedback creation data

        Returns:
            Created feedback
        """
        # Generate feedback ID
        feedback_id = await self._generate_feedback_id()

        feedback = Feedback(
            id=feedback_id,
            trip_id=data.trip_id,
            passenger_id=data.passenger_id,
            vehicle_id=data.vehicle_id,
            city=data.city,
            route=data.route,
            route_start=data.route_start,
            route_end=data.route_end,
            trip_time=data.trip_time,
            trip_duration=data.trip_duration,
            rating=data.rating,
            feedback_text=data.feedback_text,
            feedback_type=data.feedback_type,
            sentiment=data.sentiment,
            keywords=data.keywords,
            feedback_channel=data.feedback_channel,
            status="pending",
        )

        self.db.add(feedback)
        await self.db.flush()
        await self.db.refresh(feedback)
        return feedback

    async def update(self, feedback_id: str, data: FeedbackUpdate) -> Optional[Feedback]:
        """
        Update feedback.

        Args:
            feedback_id: The feedback ID
            data: Update data

        Returns:
            Updated feedback or None if not found
        """
        feedback = await self.get_by_id(feedback_id)
        if not feedback:
            return None

        update_dict = data.model_dump(exclude_unset=True)

        # Handle status update with timestamp
        if "status" in update_dict and update_dict["status"] != feedback.status:
            feedback.status = update_dict["status"]
            feedback.handled_at = datetime.now()

        # Update other fields
        for field, value in update_dict.items():
            if field != "status":  # Status handled above
                setattr(feedback, field, value)

        await self.db.flush()
        await self.db.refresh(feedback)
        return feedback

    async def batch_update(
        self, request: FeedbackBatchUpdateRequest
    ) -> FeedbackBatchUpdateResponse:
        """
        Batch update feedback status.

        Args:
            request: Batch update request

        Returns:
            Batch update result
        """
        success_count = 0
        failed_ids = []

        for feedback_id in request.ids:
            feedback = await self.get_by_id(feedback_id)
            if not feedback:
                failed_ids.append(feedback_id)
                continue

            if request.status:
                feedback.status = request.status
                feedback.handled_at = datetime.now()
            if request.handler:
                feedback.handler = request.handler

            success_count += 1

        await self.db.flush()

        return FeedbackBatchUpdateResponse(
            success_count=success_count,
            failed_count=len(failed_ids),
            failed_ids=failed_ids,
        )

    async def batch_classify(
        self, ids: List[str], classify_func
    ) -> FeedbackClassifyResponse:
        """
        Batch classify feedbacks using AI.

        Args:
            ids: List of feedback IDs
            classify_func: Async function to classify single feedback

        Returns:
            Classification results
        """
        results = []
        failed_ids = []
        success_count = 0

        for feedback_id in ids:
            feedback = await self.get_by_id(feedback_id)
            if not feedback:
                failed_ids.append(feedback_id)
                continue

            try:
                result = await classify_func(feedback.feedback_text)

                # Update feedback with classification results
                feedback.feedback_type = result.get("feedback_type", [])
                feedback.sentiment = result.get("sentiment", "neutral")
                feedback.keywords = result.get("keywords", [])

                results.append(
                    FeedbackClassifyResult(
                        id=feedback_id,
                        feedback_type=feedback.feedback_type,
                        sentiment=feedback.sentiment,
                        keywords=feedback.keywords,
                    )
                )
                success_count += 1

            except Exception:
                failed_ids.append(feedback_id)

        await self.db.flush()

        return FeedbackClassifyResponse(
            success_count=success_count,
            failed_count=len(failed_ids),
            results=results,
            failed_ids=failed_ids,
        )

    async def export_data(
        self,
        ids: Optional[List[str]] = None,
        city: Optional[str] = None,
        route: Optional[str] = None,
        rating_min: Optional[int] = None,
        rating_max: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[str] = None,
        keyword: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Export feedback data.

        Returns:
            List of feedback dictionaries for export
        """
        conditions = []

        if ids:
            conditions.append(Feedback.id.in_(ids))
        if city:
            conditions.append(Feedback.city == city)
        if route:
            conditions.append(Feedback.route.like(f"%{route}%"))
        if rating_min is not None:
            conditions.append(Feedback.rating >= rating_min)
        if rating_max is not None:
            conditions.append(Feedback.rating <= rating_max)
        if start_date:
            conditions.append(Feedback.trip_time >= start_date)
        if end_date:
            conditions.append(Feedback.trip_time <= end_date)
        if status:
            conditions.append(Feedback.status == status)
        if keyword:
            conditions.append(Feedback.feedback_text.like(f"%{keyword}%"))

        query = select(Feedback)
        if conditions:
            query = query.where(and_(*conditions))

        query = query.order_by(Feedback.trip_time.desc()).limit(1000)

        result = await self.db.execute(query)
        feedbacks = result.scalars().all()

        return [
            {
                "反馈ID": fb.id,
                "行程ID": fb.trip_id,
                "乘客ID": self._mask_passenger_id(fb.passenger_id),
                "车辆ID": fb.vehicle_id,
                "城市": fb.city,
                "路线": fb.route,
                "起点": fb.route_start,
                "终点": fb.route_end,
                "行程时间": fb.trip_time.strftime("%Y-%m-%d %H:%M:%S"),
                "行程时长": fb.trip_duration,
                "评分": fb.rating,
                "反馈内容": fb.feedback_text,
                "反馈类型": ",".join(fb.feedback_type) if fb.feedback_type else "",
                "情感": fb.sentiment,
                "关键词": ",".join(fb.keywords) if fb.keywords else "",
                "状态": fb.status,
                "处理人": fb.handler or "",
                "处理备注": fb.handler_notes or "",
                "AI摘要": fb.ai_summary or "",
                "反馈渠道": fb.feedback_channel,
                "创建时间": fb.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            }
            for fb in feedbacks
        ]

    async def _generate_feedback_id(self) -> str:
        """Generate unique feedback ID."""
        today = datetime.now().strftime("%Y%m%d")

        # Get count of today's feedbacks
        result = await self.db.execute(
            select(func.count(Feedback.id)).where(
                Feedback.id.like(f"FB{today}%")
            )
        )
        count = result.scalar() or 0

        return f"FB{today}{str(count + 1).zfill(4)}"

    def _mask_passenger_id(self, passenger_id: str) -> str:
        """
        Mask passenger ID for privacy.

        Example: P20260416001 -> PAX***001
        """
        if len(passenger_id) <= 6:
            return f"PAX***"
        return f"{passenger_id[:3]}***{passenger_id[-3:]}"
