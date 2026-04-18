"""AI analysis service."""

import asyncio
import json
import re
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
from app.services.analysis_task_store import (
    create_task,
    get_task,
    update_task_progress,
    set_task_result,
    set_task_error,
    register_running_task,
    unregister_running_task,
)
from app.utils.ai_client import AIClient, get_kimi_client, get_minimax_client
from app.config import settings
from app.services.feedback_service import FeedbackService


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
        if ai_client:
            self.ai_client = ai_client
        elif settings.AI_PROVIDER == "minimax":
            self.ai_client = get_minimax_client()
        else:
            self.ai_client = get_kimi_client()

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
            rating_min=request.rating_min,
            rating_max=request.rating_max,
            status=request.status,
            feedback_type=request.feedback_type,
            keyword=request.keyword,
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
            city=request.city,
            rating_min=request.rating_min,
            rating_max=request.rating_max,
            status=request.status,
            feedback_type=request.feedback_type,
            keyword=request.keyword,
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
            type_distribution=[
                {"type": t["type"], "count": t["count"], "percentage": t["percentage"]}
                for t in type_distribution
            ],
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
        rating_min: Optional[int] = None,
        rating_max: Optional[int] = None,
        status: Optional[List[str]] = None,
        feedback_type: Optional[List[str]] = None,
        keyword: Optional[str] = None,
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

        if rating_min is not None:
            conditions.append(Feedback.rating >= rating_min)

        if rating_max is not None:
            conditions.append(Feedback.rating <= rating_max)

        if status and len(status) > 0:
            conditions.append(Feedback.status.in_(status))

        if feedback_type and len(feedback_type) > 0:
            # Feedback can have multiple types stored as JSON list
            pass  # Will filter in Python for JSON array

        if keyword:
            conditions.append(Feedback.feedback_text.contains(keyword))

        # Get feedbacks
        query = select(Feedback)
        if conditions:
            query = query.where(and_(*conditions))
        query = query.order_by(Feedback.trip_time.desc()).limit(max_count)

        result = await self.db.execute(query)
        feedbacks = result.scalars().all()

        # Filter by feedback_type if specified (since it's a JSON array)
        if feedback_type and len(feedback_type) > 0:
            feedbacks = [
                fb
                for fb in feedbacks
                if fb.feedback_type
                and isinstance(fb.feedback_type, list)
                and any(ft in fb.feedback_type for ft in feedback_type)
            ]

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


# ===== v1.5 Analysis Pipeline =====

def is_emoji_only(text: str) -> bool:
    """Check if text contains only emoji characters."""
    emoji_pattern = re.compile(
        "[\U0001F600-\U0001F64F]"  # emoticons
        "|[\U0001F300-\U0001F5FF]"  # symbols & pictographs
        "|[\U0001F680-\U0001F6FF]"  # transport & map symbols
        "|[\U0001F1E0-\U0001F1FF]"  # flags
        "|[\U00002702-\U000027B0]"  # dingbats
        "|[\U00002460-\U000024FF]"  # enclosed alphanumerics
        "|[\U0001F251]"  # Japanese "item" counter
    )
    cleaned = emoji_pattern.sub("", text).strip()
    return len(cleaned) == 0


def clean_feedbacks(feedbacks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Clean feedback data for AI analysis.

    1. Remove invalid feedbacks (empty text, emoji-only)
    2. Sort by rating ascending, trip_time descending (low ratings first)
    """
    import sys
    print(f"DEBUG clean_feedbacks: input len={len(feedbacks)}, type={type(feedbacks)}", file=sys.stderr)
    sys.stderr.flush()
    cleaned = []
    for i, fb in enumerate(feedbacks):
        if not isinstance(fb, dict):
            print(f"DEBUG clean_feedbacks: fb[{i}] is {type(fb)}, skipping", file=sys.stderr)
            sys.stderr.flush()
            continue
        # Validate rating field
        rating_val = fb.get("rating")
        if rating_val is not None and not isinstance(rating_val, (int, float)):
            print(f"DEBUG clean_feedbacks: fb[{i}] rating is {type(rating_val)}, value={repr(rating_val)}", file=sys.stderr)
            sys.stderr.flush()
        text = fb.get("feedback_text", "").strip()
        # Skip empty text or emoji-only
        if not text or is_emoji_only(text):
            continue
        cleaned.append(fb)

    print(f"DEBUG clean_feedbacks: cleaned len={len(cleaned)}, starting sorts", file=sys.stderr)
    sys.stderr.flush()

    # Sort by rating ascending, trip_time descending (low ratings first)
    # Use stable sort: first by trip_time descending, then by rating ascending
    try:
        # Force all trip_time to comparable values - convert to timestamp or empty string
        def get_trip_time_key(x):
            tt = x.get("trip_time")
            if tt is None:
                return ""  # None treated as empty string
            if hasattr(tt, 'timestamp'):  # datetime object
                return tt.timestamp()
            return str(tt)  # fallback to string
        cleaned.sort(key=get_trip_time_key, reverse=True)
        print(f"DEBUG clean_feedbacks: first sort done", file=sys.stderr)
        sys.stderr.flush()
    except Exception as e:
        print(f"DEBUG clean_feedbacks: first sort error: {e}", file=sys.stderr)
        if cleaned:
            print(f"DEBUG clean_feedbacks: first item trip_time={repr(cleaned[0].get('trip_time'))}", file=sys.stderr)
        sys.stderr.flush()
        raise
    try:
        # Ensure rating is int for sorting - use float to handle any numeric strings
        def get_rating(x):
            r = x.get("rating")
            if r is None:
                return 0  # Default for None
            if isinstance(r, (int, float)):
                return r
            # If it's a string that can be parsed, do so
            if isinstance(r, str):
                try:
                    return float(r)
                except:
                    pass
            # If it's a list or other type, this will fail
            raise TypeError(f"rating is {type(r)}, value={repr(r)}")
        cleaned.sort(key=get_rating, reverse=False)
        print(f"DEBUG clean_feedbacks: second sort done", file=sys.stderr)
        sys.stderr.flush()
    except Exception as e:
        print(f"DEBUG clean_feedbacks: second sort error: {e}", file=sys.stderr)
        if cleaned:
            bad_item = cleaned[0]
            print(f"DEBUG clean_feedbacks: bad item rating={repr(bad_item.get('rating'))}, type={type(bad_item.get('rating'))}", file=sys.stderr)
            print(f"DEBUG clean_feedbacks: bad item full keys={list(bad_item.keys())}", file=sys.stderr)
        sys.stderr.flush()
        raise

    return cleaned


async def run_analysis_task(task_id: str, filters: dict, db: AsyncSession) -> None:
    """
    Execute the AI analysis pipeline.

    Steps:
    - Step 1 [0-10%]: Get feedback data based on filters
    - Step 2 [10-30%]: Clean data
    - Step 3 [30-60%]: Generate AI summary
    - Step 4 [60-85%]: Product problem analysis
    - Step 5 [85-100%]: Generate optimization suggestions
    """
    try:
        import sys
        import traceback
        print(f"Starting analysis task with filters: {filters}", file=sys.stderr)
        sys.stderr.flush()
        update_task_progress(task_id, 0, "processing")

        # Step 1: Get feedback data (0-10%)
        update_task_progress(task_id, 5)
        feedback_service = FeedbackService(db)
        print(f"Calling for_analysis with filters: {filters}", file=sys.stderr)
        print(f"  status type: {type(filters.get('status'))}, value: {filters.get('status')}", file=sys.stderr)
        print(f"  feedback_type type: {type(filters.get('feedback_type'))}, value: {filters.get('feedback_type')}", file=sys.stderr)
        sys.stderr.flush()
        feedbacks, stats = await feedback_service.for_analysis(
            start_date=filters.get("start_date"),
            end_date=filters.get("end_date"),
            city=filters.get("city"),
            rating_min=filters.get("rating_min"),
            rating_max=filters.get("rating_max"),
            status=filters.get("status"),
            keyword=filters.get("keyword"),
            feedback_type=filters.get("feedback_type"),
            max_count=2000,
        )
        print(f"Step 1 done: {len(feedbacks)} feedbacks, stats={stats}", file=sys.stderr)
        sys.stderr.flush()
        update_task_progress(task_id, 10)

        # Step 2: Clean data (10-30%)
        update_task_progress(task_id, 15)
        # DEBUG: Check feedbacks structure before cleaning
        print(f"DEBUG Step 2: feedbacks type={type(feedbacks)}, len={len(feedbacks) if feedbacks else 0}", file=sys.stderr)
        if feedbacks and len(feedbacks) > 0:
            fb0 = feedbacks[0]
            print(f"DEBUG Step 2: first fb type={type(fb0)}, keys={list(fb0.keys()) if isinstance(fb0, dict) else 'NOT_A_DICT'}", file=sys.stderr)
            if isinstance(fb0, dict):
                r = fb0.get('rating')
                print(f"DEBUG Step 2: rating={repr(r)}, type={type(r)}, trip_time={repr(fb0.get('trip_time'))}", file=sys.stderr)
                # Check all items for non-int rating
                bad_ratings = [(i, type(fb.get('rating')), repr(fb.get('rating'))) for i, fb in enumerate(feedbacks) if fb.get('rating') is not None and not isinstance(fb.get('rating'), (int, float))]
                if bad_ratings:
                    print(f"DEBUG Step 2: FOUND BAD RATINGS: {bad_ratings[:5]}", file=sys.stderr)
            else:
                print(f"DEBUG Step 2: fb0={repr(fb0)[:200]}", file=sys.stderr)
        sys.stderr.flush()
        cleaned_data = clean_feedbacks(feedbacks)
        print(f"Step 2 done: {len(cleaned_data)} cleaned", file=sys.stderr)
        sys.stderr.flush()
        update_task_progress(task_id, 30)

        # Prepare data for AI calls
        feedback_texts = [fb.get("feedback_text", "") for fb in cleaned_data]
        feedback_for_analysis = [
            {"rating": fb.get("rating", 0), "feedback_text": fb.get("feedback_text", "")}
            for fb in cleaned_data
        ]

        # Collect negative feedbacks for suggestions
        negative_feedbacks = [
            fb.get("feedback_text", "")
            for fb in cleaned_data
            if fb.get("rating", 0) <= 2
        ]
        print(f"Preparing AI calls: {len(feedback_texts)} texts, {len(negative_feedbacks)} negative", file=sys.stderr)
        sys.stderr.flush()

        # Step 3: Generate summary (30-60%)
        update_task_progress(task_id, 35)
        ai_client = get_minimax_client() if settings.AI_PROVIDER == "minimax" else get_kimi_client()
        print(f"Calling summarize_v2 with stats: {stats}", file=sys.stderr)
        sys.stderr.flush()
        try:
            summary = await ai_client.summarize_v2(feedback_texts, stats)
            print(f"Step 3 done: summary={summary[:100] if summary else None}", file=sys.stderr)
        except Exception as e:
            import traceback
            print(f"Step 3 FAILED: {e}, trace={traceback.format_exc()[:200]}", file=sys.stderr)
            # Fallback: generate structured summary from stats when AI fails
            pos_rate = stats.get('positive_rate', 0) * 100
            neg_rate = stats.get('negative_rate', 0) * 100
            avg_rating = stats.get('avg_rating', 0)
            summary = (
                f"整体满意度：【基于{stats.get('total_count', 0)}条数据分析】平均评分{avg_rating}分，"
                f"好评率{pos_rate:.0f}%，差评率{neg_rate:.0f}%。\n"
                f"正面体验：暂无明确正面反馈记录。\n"
                f"突出不满：共{stats.get('total_count', 0)}条反馈，详见下方问题分类。\n"
                f"核心建议：请参考下方问题分类及优化建议。"
            )
        sys.stderr.flush()
        update_task_progress(task_id, 60)

        # Step 4: Analyze problems (60-85%)
        update_task_progress(task_id, 65)
        try:
            problems_result = await ai_client.analyze_problems(feedback_for_analysis)
            print(f"Step 4 done: {len(problems_result.get('categories', []))} categories", file=sys.stderr)
        except Exception as e:
            import traceback
            print(f"Step 4 FAILED: {e}, trace={traceback.format_exc()[:200]}", file=sys.stderr)
            problems_result = {"categories": [], "top_problems": []}
        sys.stderr.flush()

        # Fallback: if categories still empty, generate from data
        if not problems_result.get("categories"):
            print("Step 4: Using fallback category generation", file=sys.stderr)
            sys.stderr.flush()
            problems_result = _generate_fallback_categories(cleaned_data, stats)
        update_task_progress(task_id, 85)

        # Step 5: Generate suggestions (85-100%)
        update_task_progress(task_id, 90)
        try:
            suggestions = await ai_client.generate_suggestions_v2(
                problem_categories=problems_result.get("categories", []),
                negative_feedbacks=negative_feedbacks,
            )
            print(f"Step 5 done: {len(suggestions)} suggestions", file=sys.stderr)
        except Exception as e:
            import traceback
            print(f"Step 5 FAILED: {e}, trace={traceback.format_exc()[:200]}", file=sys.stderr)
            suggestions = []
        sys.stderr.flush()
        update_task_progress(task_id, 100)

        # Save results
        set_task_result(
            task_id=task_id,
            summary=summary,
            problems=problems_result.get("categories", []),
            suggestions=suggestions,
            analyzed_count=len(cleaned_data),
        )

    except asyncio.CancelledError:
        set_task_error(task_id, "Task was cancelled")
        raise
    except Exception as e:
        import traceback
        import sys
        print(f"ERROR in run_analysis_task: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        error_detail = f"Analysis failed: {str(e)}\n{traceback.format_exc()}"
        set_task_error(task_id, error_detail)
    finally:
        unregister_running_task(task_id)


def _generate_fallback_categories(cleaned_data: List[Dict[str, Any]], stats: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate problem categories from feedback data as fallback when AI fails.
    """
    # Predefined categories with keywords to match
    category_keywords = {
        "行驶体验": ["变道", "刹车", "加速", "停车", "行驶", "车道", "转弯", "方向盘", "自动驾驶"],
        "车内环境": ["温度", "空调", "暖气", "噪音", "脏", "清洁", "座位", "座椅", "舒适", "振动", "晃"],
        "接驾体验": ["等待", "等候", "接驾", "上车", "下车", "司机", "响应", "到达", "久等"],
        "路线规划": ["导航", "路线", "拥堵", "红灯", "堵车", "路线规划", "错过", "路口"],
        "安全感受": ["安全带", "安全", "危险", "紧急", "预警", "碰撞", "事故"],
        "服务态度": ["客服", "服务", "态度", "投诉", "回复", "响应", "解决", "沟通"],
    }

    # Initialize category counters
    category_data: Dict[str, Dict[str, Any]] = {
        cat: {"count": 0, "negative_count": 0, "quotes": [], "issues": set()}
        for cat in category_keywords
    }
    category_data["其他"] = {"count": 0, "negative_count": 0, "quotes": [], "issues": set()}

    for fb in cleaned_data:
        text = fb.get("feedback_text", "")
        rating = fb.get("rating", 0)
        is_negative = rating <= 2

        # Match categories
        matched = False
        for cat, keywords in category_keywords.items():
            for kw in keywords:
                if kw in text:
                    category_data[cat]["count"] += 1
                    if is_negative:
                        category_data[cat]["negative_count"] += 1
                    # Extract quote (up to 50 chars)
                    if len(category_data[cat]["quotes"]) < 3:
                        category_data[cat]["quotes"].append(text[:50])
                    matched = True
                    break
            if matched:
                break

        if not matched:
            category_data["其他"]["count"] += 1
            if is_negative:
                category_data["其他"]["negative_count"] += 1

    total = len(cleaned_data) or 1
    total_negative = max(sum(1 for fb in cleaned_data if fb.get("rating", 0) <= 2), 1)

    categories = []
    for cat, data in category_data.items():
        if data["count"] > 0:
            neg_rate = data["negative_count"] / total_negative
            severity = data["negative_count"] * neg_rate
            categories.append({
                "name": cat,
                "is_existing": True,
                "count": data["count"],
                "percentage": data["count"] / total,
                "negative_rate": neg_rate,
                "severity_score": severity,
                "common_issues": list(data["issues"])[:5] if data["issues"] else ["一般问题"],
                "user_quotes": data["quotes"][:2] if data["quotes"] else [],
            })

    # Sort by severity descending
    categories.sort(key=lambda x: x.get("severity_score", 0), reverse=True)

    return {
        "categories": categories,
        "top_problems": [
            {"category": c["name"], "severity_score": c["severity_score"], "problem": c["name"]}
            for c in categories[:5]
        ]
    }


async def start_analysis_task(filters: dict, db: AsyncSession) -> str:
    """
    Start an analysis task in the background.

    Args:
        filters: Filter parameters from FilterBar
        db: Database session (from FastAPI dependency, will be closed after API returns)

    Returns:
        task_id: The ID of the created task
    """
    # Create task
    task_id = create_task(filters)

    # Start background task - get a fresh db context for the background task
    from app.database import AsyncSessionLocal
    async def run_with_new_session():
        async with AsyncSessionLocal() as session:
            await run_analysis_task(task_id, filters, session)

    task = asyncio.create_task(run_with_new_session())
    register_running_task(task_id, task)

    return task_id
