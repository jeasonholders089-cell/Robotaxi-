"""AI analysis service."""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.feedback import Feedback
from app.schemas.stats import (
    AISuggestionsResponse,
    AISuggestionsRequest,
    AISummaryResponse,
    AISummaryRequest,
)
from app.utils.ai_client import AIClient, get_kimi_client


class AIService:
    """Service for AI-powered analysis."""

    # Feedback categories
    CATEGORIES = [
        "行驶体验",
        "车内环境",
        "接驾体验",
        "路线规划",
        "安全感受",
        "服务态度",
        "其他",
    ]

    def __init__(self, db: AsyncSession, ai_client: Optional[AIClient] = None):
        """Initialize service with database session and AI client."""
        self.db = db
        self.ai_client = ai_client or get_kimi_client()

    async def classify_single(self, feedback_text: str) -> Dict[str, Any]:
        """
        Classify a single feedback.

        Args:
            feedback_text: The feedback text to classify

        Returns:
            Classification result with type, sentiment, and keywords
        """
        try:
            result = await self.ai_client.classify(feedback_text, self.CATEGORIES)
            return result
        except Exception as e:
            # Fallback on error
            return {
                "feedback_type": ["其他"],
                "sentiment": "neutral",
                "keywords": [],
            }

    async def classify_batch(
        self, ids: List[str]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Batch classify multiple feedbacks.

        Args:
            ids: List of feedback IDs

        Returns:
            Dictionary with results and failed_ids
        """
        results = []
        failed_ids = []

        for feedback_id in ids:
            feedback = await self._get_feedback(feedback_id)
            if not feedback:
                failed_ids.append(feedback_id)
                continue

            try:
                result = await self.classify_single(feedback.feedback_text)

                # Update feedback record
                feedback.feedback_type = result.get("feedback_type", [])
                feedback.sentiment = result.get("sentiment", "neutral")
                feedback.keywords = result.get("keywords", [])

                results.append(
                    {
                        "id": feedback_id,
                        "feedback_type": feedback.feedback_type,
                        "sentiment": feedback.sentiment,
                        "keywords": feedback.keywords,
                    }
                )

            except Exception:
                failed_ids.append(feedback_id)

        await self.db.flush()

        return {"results": results, "failed_ids": failed_ids}

    async def generate_summary(
        self, request: AISummaryRequest
    ) -> AISummaryResponse:
        """
        Generate AI summary for feedback data.

        Args:
            request: Summary request parameters

        Returns:
            Generated summary
        """
        # Get feedback data
        feedbacks, stats = await self._get_feedback_data_for_analysis(
            start_date=request.start_date,
            end_date=request.end_date,
            city=request.city,
            max_count=request.max_count,
        )

        if not feedbacks:
            return AISummaryResponse(
                summary="No feedback data available for the specified criteria.",
                generated_at=datetime.now(),
                analyzed_count=0,
            )

        # Extract feedback texts and prepare stats
        feedback_samples = [fb.feedback_text for fb in feedbacks]
        stats_dict = {
            "total_count": stats["total_count"],
            "avg_rating": stats["avg_rating"],
            "positive_rate": stats["positive_rate"],
            "negative_rate": stats["negative_rate"],
        }

        # Generate summary
        try:
            summary_text = await self.ai_client.summarize(
                feedback_samples=feedback_samples,
                stats=stats_dict,
                length=request.length,
            )
        except Exception:
            summary_text = "AI summary generation is temporarily unavailable."

        return AISummaryResponse(
            summary=summary_text,
            generated_at=datetime.now(),
            analyzed_count=len(feedback_samples),
        )

    async def generate_suggestions(
        self, request: AISuggestionsRequest
    ) -> AISuggestionsResponse:
        """
        Generate product improvement suggestions.

        Args:
            request: Suggestions request parameters

        Returns:
            Generated suggestions
        """
        # Get feedback data
        feedbacks, stats = await self._get_feedback_data_for_analysis(
            start_date=request.start_date,
            end_date=request.end_date,
            city=None,
            max_count=500,
        )

        if not feedbacks:
            return AISuggestionsResponse(
                suggestions=[],
                generated_at=datetime.now(),
            )

        # Calculate type distribution
        type_counts: Dict[str, int] = {}
        negative_feedbacks: List[str] = []

        for fb in feedbacks:
            # Count types
            if fb.feedback_type and isinstance(fb.feedback_type, list):
                for t in fb.feedback_type:
                    type_counts[t] = type_counts.get(t, 0) + 1

            # Collect negative feedbacks
            if fb.rating <= 2:
                negative_feedbacks.append(fb.feedback_text)

        # Build type distribution
        total = len(feedbacks)
        type_distribution = [
            {
                "type": t,
                "count": c,
                "percentage": c / total if total > 0 else 0,
            }
            for t, c in sorted(type_counts.items(), key=lambda x: x[1], reverse=True)
        ]

        # Generate suggestions
        stats_dict = {
            "total_count": stats["total_count"],
            "avg_rating": stats["avg_rating"],
        }

        try:
            suggestions_data = await self.ai_client.generate_suggestions(
                type_distribution=type_distribution,
                negative_feedbacks=negative_feedbacks[:20],
                stats=stats_dict,
                top_n=request.top_n,
            )
        except Exception:
            suggestions_data = []

        from app.schemas.stats import AISuggestionItem

        suggestions = [
            AISuggestionItem(
                priority=s.get("priority", "medium"),
                category=s.get("category", "其他"),
                problem=s.get("problem", ""),
                count=s.get("count", 0),
                percentage=s.get("percentage", 0),
                negative_rate=s.get("negative_rate", 0),
                user_voices=s.get("user_voices", []),
                suggestions=s.get("suggestions", []),
            )
            for s in suggestions_data
        ]

        return AISuggestionsResponse(
            suggestions=suggestions,
            generated_at=datetime.now(),
        )

    async def _get_feedback(
        self, feedback_id: str
    ) -> Optional[Feedback]:
        """Get single feedback by ID."""
        result = await self.db.execute(
            select(Feedback).where(Feedback.id == feedback_id)
        )
        return result.scalar_one_or_none()

    async def _get_feedback_data_for_analysis(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        city: Optional[str] = None,
        max_count: int = 100,
    ) -> tuple:
        """
        Get feedback data for AI analysis.

        Returns:
            Tuple of (feedbacks list, stats dictionary)
        """
        conditions = []

        if start_date:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                conditions.append(Feedback.trip_time >= start_dt)
            except ValueError:
                pass

        if end_date:
            try:
                end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                end_dt = end_dt.replace(hour=23, minute=59, second=59)
                conditions.append(Feedback.trip_time <= end_dt)
            except ValueError:
                pass

        if city:
            conditions.append(Feedback.city == city)

        # Get feedbacks
        query = select(Feedback)
        if conditions:
            query = query.where(and_(*conditions))
        query = query.order_by(Feedback.trip_time.desc()).limit(max_count)

        result = await self.db.execute(query)
        feedbacks = result.scalars().all()

        # Calculate stats
        total = len(feedbacks)
        if total == 0:
            return feedbacks, {
                "total_count": 0,
                "avg_rating": 0,
                "positive_rate": 0,
                "negative_rate": 0,
            }

        avg_rating = sum(fb.rating for fb in feedbacks) / total
        positive_count = sum(1 for fb in feedbacks if fb.rating >= 4)
        negative_count = sum(1 for fb in feedbacks if fb.rating <= 2)

        stats = {
            "total_count": total,
            "avg_rating": round(avg_rating, 1),
            "positive_rate": positive_count / total,
            "negative_rate": negative_count / total,
        }

        return feedbacks, stats
