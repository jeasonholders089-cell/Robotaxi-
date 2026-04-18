"""Statistics business logic service."""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.feedback import Feedback
from app.schemas.stats import (
    CityDistribution,
    DistributionData,
    HourDistribution,
    OverviewData,
    OverviewTrends,
    RatingDistribution,
    RouteDistribution,
    TrendData,
    TrendDataPoint,
    TypeDistribution,
)


class StatsService:
    """Service for generating statistics and analytics."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db

    async def get_overview(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        city: Optional[str] = None,
        rating_min: Optional[int] = None,
        rating_max: Optional[int] = None,
        status: Optional[str] = None,
        feedback_type: Optional[str] = None,
    ) -> OverviewData:
        """
        Get overview statistics.

        Args:
            start_date: Start date filter
            end_date: End date filter
            city: City filter
            rating_min: Minimum rating filter
            rating_max: Maximum rating filter
            status: Status filter
            feedback_type: Feedback type filter (comma-separated)

        Returns:
            Overview statistics data
        """
        import json
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        # Build base conditions
        base_conditions = []
        if city:
            base_conditions.append(Feedback.city == city)
        if rating_min is not None:
            base_conditions.append(Feedback.rating >= rating_min)
        if rating_max is not None:
            base_conditions.append(Feedback.rating <= rating_max)
        if status:
            base_conditions.append(Feedback.status == status)
        if feedback_type:
            # feedback_type is comma-separated string, convert to list and check JSON array contains
            type_list = [t.strip() for t in feedback_type.split(',') if t.strip()]
            if type_list:
                type_conditions = [Feedback.feedback_type.contains(json.dumps([ft])) for ft in type_list]
                from sqlalchemy import or_
                base_conditions.append(or_(*type_conditions))

        # Total count (with date range if provided)
        total_query = select(func.count(Feedback.id))
        if base_conditions:
            total_query = total_query.where(and_(*base_conditions))
        if start_date:
            total_query = total_query.where(Feedback.trip_time >= start_date)
        if end_date:
            total_query = total_query.where(Feedback.trip_time <= end_date)

        total_result = await self.db.execute(total_query)
        total_count = total_result.scalar() or 0

        # Today's count
        today_query = select(func.count(Feedback.id)).where(
            Feedback.trip_time >= today
        )
        if base_conditions:
            today_query = today_query.where(and_(*base_conditions))
        today_result = await self.db.execute(today_query)
        today_count = today_result.scalar() or 0

        # Average rating
        avg_query = select(func.avg(Feedback.rating))
        if base_conditions:
            avg_query = avg_query.where(and_(*base_conditions))
        if start_date:
            avg_query = avg_query.where(Feedback.trip_time >= start_date)
        if end_date:
            avg_query = avg_query.where(Feedback.trip_time <= end_date)
        avg_result = await self.db.execute(avg_query)
        avg_rating = float(avg_result.scalar() or 0)

        # Positive rate (rating >= 4)
        positive_query = select(
            func.count(Feedback.id)
        ).where(Feedback.rating >= 4)
        if base_conditions:
            positive_query = positive_query.where(and_(*base_conditions))
        if start_date:
            positive_query = positive_query.where(Feedback.trip_time >= start_date)
        if end_date:
            positive_query = positive_query.where(Feedback.trip_time <= end_date)
        positive_result = await self.db.execute(positive_query)
        positive_count = positive_result.scalar() or 0
        positive_rate = positive_count / total_count if total_count > 0 else 0

        # Negative rate (rating <= 2)
        negative_query = select(
            func.count(Feedback.id)
        ).where(Feedback.rating <= 2)
        if base_conditions:
            negative_query = negative_query.where(and_(*base_conditions))
        if start_date:
            negative_query = negative_query.where(Feedback.trip_time >= start_date)
        if end_date:
            negative_query = negative_query.where(Feedback.trip_time <= end_date)
        negative_result = await self.db.execute(negative_query)
        negative_count = negative_result.scalar() or 0
        negative_rate = negative_count / total_count if total_count > 0 else 0

        # Pending count
        pending_query = select(func.count(Feedback.id)).where(
            Feedback.status == "pending"
        )
        if base_conditions:
            pending_query = pending_query.where(and_(*base_conditions))
        pending_result = await self.db.execute(pending_query)
        pending_count = pending_result.scalar() or 0

        # Calculate trends (compare with previous period)
        trends = await self._calculate_trends(
            start_date, end_date, city, base_conditions
        )

        return OverviewData(
            total_count=total_count,
            today_count=today_count,
            avg_rating=round(avg_rating, 1),
            positive_rate=round(positive_rate, 4),
            negative_rate=round(negative_rate, 4),
            pending_count=pending_count,
            trends=trends,
        )

    async def _calculate_trends(
        self,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        city: Optional[str],
        base_conditions: List[Any],
    ) -> Optional[OverviewTrends]:
        """Calculate period-over-period trends."""
        if not end_date:
            end_date = datetime.now()
        if not start_date:
            start_date = end_date - timedelta(days=7)

        period_days = (end_date - start_date).days
        prev_start = start_date - timedelta(days=period_days)
        prev_end = start_date

        # Previous period stats
        prev_total_query = select(func.count(Feedback.id))
        if base_conditions:
            prev_total_query = prev_total_query.where(and_(*base_conditions))
        prev_total_query = prev_total_query.where(
            and_(
                Feedback.trip_time >= prev_start,
                Feedback.trip_time < prev_end,
            )
        )
        prev_total_result = await self.db.execute(prev_total_query)
        prev_total = prev_total_result.scalar() or 0

        # Previous avg rating
        prev_avg_query = select(func.avg(Feedback.rating))
        if base_conditions:
            prev_avg_query = prev_avg_query.where(and_(*base_conditions))
        prev_avg_query = prev_avg_query.where(
            and_(
                Feedback.trip_time >= prev_start,
                Feedback.trip_time < prev_end,
            )
        )
        prev_avg_result = await self.db.execute(prev_avg_query)
        prev_avg = float(prev_avg_result.scalar() or 0)

        # Previous positive rate
        prev_positive_query = select(
            func.count(Feedback.id)
        ).where(and_(Feedback.rating >= 4))
        if base_conditions:
            prev_positive_query = prev_positive_query.where(and_(*base_conditions))
        prev_positive_query = prev_positive_query.where(
            and_(
                Feedback.trip_time >= prev_start,
                Feedback.trip_time < prev_end,
            )
        )
        prev_positive_result = await self.db.execute(prev_positive_query)
        prev_positive = prev_positive_result.scalar() or 0
        prev_positive_rate = prev_positive / prev_total if prev_total > 0 else 0

        # Current period stats
        curr_total_query = select(func.count(Feedback.id))
        if base_conditions:
            curr_total_query = curr_total_query.where(and_(*base_conditions))
        curr_total_query = curr_total_query.where(
            and_(
                Feedback.trip_time >= start_date,
                Feedback.trip_time <= end_date,
            )
        )
        curr_total_result = await self.db.execute(curr_total_query)
        curr_total = curr_total_result.scalar() or 0

        # Current avg rating
        curr_avg_query = select(func.avg(Feedback.rating))
        if base_conditions:
            curr_avg_query = curr_avg_query.where(and_(*base_conditions))
        curr_avg_query = curr_avg_query.where(
            and_(
                Feedback.trip_time >= start_date,
                Feedback.trip_time <= end_date,
            )
        )
        curr_avg_result = await self.db.execute(curr_avg_query)
        curr_avg = float(curr_avg_result.scalar() or 0)

        # Current positive rate
        curr_positive_query = select(
            func.count(Feedback.id)
        ).where(and_(Feedback.rating >= 4))
        if base_conditions:
            curr_positive_query = curr_positive_query.where(and_(*base_conditions))
        curr_positive_query = curr_positive_query.where(
            and_(
                Feedback.trip_time >= start_date,
                Feedback.trip_time <= end_date,
            )
        )
        curr_positive_result = await self.db.execute(curr_positive_query)
        curr_positive = curr_positive_result.scalar() or 0
        curr_positive_rate = curr_positive / curr_total if curr_total > 0 else 0

        # Calculate changes
        total_change = (
            ((curr_total - prev_total) / prev_total * 100)
            if prev_total > 0
            else 0
        )
        avg_change = (
            ((curr_avg - prev_avg) / prev_avg * 100) if prev_avg > 0 else 0
        )
        positive_change = (
            (curr_positive_rate - prev_positive_rate) * 100
        )

        return OverviewTrends(
            total_count_change=round(total_change, 1),
            avg_rating_change=round(avg_change, 1),
            positive_rate_change=round(positive_change, 1),
        )

    async def get_trend(
        self,
        granularity: str = "daily",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        city: Optional[str] = None,
    ) -> TrendData:
        """
        Get trend data over time.

        Args:
            granularity: daily, weekly, or monthly
            start_date: Start date
            end_date: End date
            city: City filter

        Returns:
            Trend data with count and rating over time
        """
        if not end_date:
            end_date = datetime.now()
        if not start_date:
            start_date = end_date - timedelta(days=30)

        # Build date format based on granularity
        if granularity == "monthly":
            date_format = "%Y-%m"
        elif granularity == "weekly":
            date_format = "%Y-W%W"
        else:
            date_format = "%Y-%m-%d"

        # Get trend data grouped by date
        query = select(
            func.date_format(Feedback.trip_time, date_format).label("date"),
            func.count(Feedback.id).label("count"),
            func.avg(Feedback.rating).label("rating_avg"),
        ).where(
            and_(
                Feedback.trip_time >= start_date,
                Feedback.trip_time <= end_date,
            )
        )

        if city:
            query = query.where(Feedback.city == city)

        query = query.group_by(
            func.date_format(Feedback.trip_time, date_format)
        ).order_by(
            func.date_format(Feedback.trip_time, date_format)
        )

        result = await self.db.execute(query)
        rows = result.all()

        count_trend = [
            TrendDataPoint(date=row.date, count=row.count, rating_avg=round(float(row.rating_avg), 1))
            for row in rows
        ]

        # Get rating distribution
        rating_distribution = await self.get_rating_distribution(
            start_date, end_date, city
        )

        return TrendData(
            count_trend=count_trend,
            rating_distribution=rating_distribution,
        )

    async def get_rating_distribution(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        city: Optional[str] = None,
    ) -> List[RatingDistribution]:
        """Get distribution of ratings."""
        conditions = []
        if start_date:
            conditions.append(Feedback.trip_time >= start_date)
        if end_date:
            conditions.append(Feedback.trip_time <= end_date)
        if city:
            conditions.append(Feedback.city == city)

        # Total count for percentage calculation
        total_query = select(func.count(Feedback.id))
        if conditions:
            total_query = total_query.where(and_(*conditions))
        total_result = await self.db.execute(total_query)
        total = total_result.scalar() or 0

        # Rating distribution
        query = select(
            Feedback.rating,
            func.count(Feedback.id).label("count"),
        ).group_by(Feedback.rating)

        if conditions:
            query = query.where(and_(*conditions))

        result = await self.db.execute(query)
        rows = result.all()

        return [
            RatingDistribution(
                rating=row.rating,
                count=row.count,
                percentage=round(row.count / total, 4) if total > 0 else 0,
            )
            for row in rows
        ]

    async def get_distribution(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        city: Optional[str] = None,
    ) -> DistributionData:
        """
        Get distribution data across various dimensions.

        Returns:
            Distribution data for cities, routes, types, and hours
        """
        if not end_date:
            end_date = datetime.now()
        if not start_date:
            start_date = end_date - timedelta(days=30)

        # Base conditions
        conditions = []
        if start_date:
            conditions.append(Feedback.trip_time >= start_date)
        if end_date:
            conditions.append(Feedback.trip_time <= end_date)
        if city:
            conditions.append(Feedback.city == city)

        # Total count
        total_query = select(func.count(Feedback.id))
        if conditions:
            total_query = total_query.where(and_(*conditions))
        total_result = await self.db.execute(total_query)
        total = total_result.scalar() or 0

        # City distribution
        city_query = select(
            Feedback.city,
            func.count(Feedback.id).label("count"),
        ).group_by(Feedback.city).order_by(func.count(Feedback.id).desc()).limit(10)

        if conditions:
            city_query = city_query.where(and_(*conditions))
        city_result = await self.db.execute(city_query)
        city_rows = city_result.all()

        city_distribution = [
            CityDistribution(
                city=row.city,
                count=row.count,
                percentage=round(row.count / total, 4) if total > 0 else 0,
            )
            for row in city_rows
        ]

        # Route distribution
        route_query = select(
            Feedback.route,
            func.count(Feedback.id).label("count"),
        ).group_by(Feedback.route).order_by(func.count(Feedback.id).desc()).limit(10)

        if conditions:
            route_query = route_query.where(and_(*conditions))
        route_result = await self.db.execute(route_query)
        route_rows = route_result.all()

        # Calculate negative rate for each route
        route_distribution = []
        for row in route_rows:
            neg_query = select(func.count(Feedback.id)).where(
                and_(
                    Feedback.route == row.route,
                    Feedback.rating <= 2,
                )
            )
            if start_date:
                neg_query = neg_query.where(Feedback.trip_time >= start_date)
            if end_date:
                neg_query = neg_query.where(Feedback.trip_time <= end_date)
            neg_result = await self.db.execute(neg_query)
            neg_count = neg_result.scalar() or 0

            route_distribution.append(
                RouteDistribution(
                    route=row.route,
                    count=row.count,
                    negative_rate=round(neg_count / row.count, 4) if row.count > 0 else 0,
                )
            )

        # Type distribution (from JSON array)
        type_query = select(Feedback.feedback_type).where(
            Feedback.feedback_type.isnot(None)
        )
        if conditions:
            type_query = type_query.where(and_(*conditions))

        type_result = await self.db.execute(type_query)
        type_rows = type_result.scalars().all()

        # Count types
        type_counts: Dict[str, int] = {}
        for type_json in type_rows:
            if isinstance(type_json, list):
                for t in type_json:
                    type_counts[t] = type_counts.get(t, 0) + 1

        type_distribution = [
            TypeDistribution(
                type=t,
                count=c,
                percentage=round(c / total, 4) if total > 0 else 0,
            )
            for t, c in sorted(type_counts.items(), key=lambda x: x[1], reverse=True)
        ]

        # Hour distribution
        hour_query = select(
            func.hour(Feedback.trip_time).label("hour"),
            func.count(Feedback.id).label("count"),
        ).group_by(func.hour(Feedback.trip_time)).order_by(func.hour(Feedback.trip_time))

        if conditions:
            hour_query = hour_query.where(and_(*conditions))

        hour_result = await self.db.execute(hour_query)
        hour_rows = hour_result.all()

        # Group into time periods
        hour_groups = {
            "0-2": 0,
            "3-5": 0,
            "6-8": 0,
            "9-11": 0,
            "12-14": 0,
            "15-17": 0,
            "18-20": 0,
            "21-23": 0,
        }

        for row in hour_rows:
            h = row.hour
            if h < 3:
                hour_groups["0-2"] += row.count
            elif h < 6:
                hour_groups["3-5"] += row.count
            elif h < 9:
                hour_groups["6-8"] += row.count
            elif h < 12:
                hour_groups["9-11"] += row.count
            elif h < 15:
                hour_groups["12-14"] += row.count
            elif h < 18:
                hour_groups["15-17"] += row.count
            elif h < 21:
                hour_groups["18-20"] += row.count
            else:
                hour_groups["21-23"] += row.count

        hour_distribution = [
            HourDistribution(hour=h, count=c)
            for h, c in hour_groups.items()
        ]

        return DistributionData(
            city_distribution=city_distribution,
            route_distribution=route_distribution,
            type_distribution=type_distribution,
            hour_distribution=hour_distribution,
        )
