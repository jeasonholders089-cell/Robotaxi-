"""FastAPI application entry point."""

import asyncio
import json
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import close_db, init_db, AsyncSessionLocal
from app.services.analysis_task_store import initiate_graceful_shutdown, wait_for_tasks_to_complete


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    # Startup
    await init_db()
    yield
    # Shutdown - wait for background analysis tasks to complete
    initiate_graceful_shutdown()
    # Give tasks up to 30 seconds to finish gracefully
    await wait_for_tasks_to_complete(timeout=30.0)
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    description="Robotaxi Passenger Feedback Management Platform API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from app.api import feedback_router, stats_router, ai_router


app.include_router(feedback_router, prefix=settings.API_PREFIX)
app.include_router(stats_router, prefix=settings.API_PREFIX)
app.include_router(ai_router, prefix=settings.API_PREFIX)


@app.get("/")
async def root() -> dict:
    """Root endpoint."""
    return {"message": "Robotaxi Feedback Management Platform API", "version": "1.0.0"}


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/admin/init-data")
async def init_data():
    """
    Initialize database with mock data.
    Searches for feedbacks.json in common locations.
    """
    # Find JSON data file
    json_paths = [
        Path("/app/feedbacks_full.json"),
        Path("/app/feedbacks.json"),
        Path("feedbacks_full.json"),
        Path("../feedbacks_full.json"),
    ]

    json_path = None
    for p in json_paths:
        if p.exists():
            json_path = p
            break

    if not json_path:
        raise HTTPException(status_code=404, detail=f"JSON data file not found in any of: {[str(p) for p in json_paths]}")

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    data_list = data.get('data', []) or data.get('list', []) or data

    async with AsyncSessionLocal() as session:
        # Clear existing data
        await session.execute(text("DELETE FROM feedback"))
        await session.commit()

        # Import each record
        success_count = 0
        for record in data_list:
            try:
                trip_time_str = record.get('trip_time', '').replace('T', ' ')
                trip_time = datetime.strptime(trip_time_str, '%Y-%m-%d %H:%M:%S')

                reply_time = None
                reply_time_str = record.get('reply_time')
                if reply_time_str:
                    try:
                        reply_time = datetime.strptime(reply_time_str.replace('T', ' '), '%Y-%m-%d %H:%M:%S')
                    except:
                        reply_time = None

                status_map = {'待处理': 'pending', '处理中': 'processing', '已处理': 'resolved', '已解决': 'resolved', '已关闭': 'closed'}
                status = status_map.get(record.get('status', '待处理'), 'pending')

                route = record.get('route', '')
                if '→' in route:
                    parts = route.split('→')
                    route_start, route_end = parts[0].strip(), parts[1].strip()
                else:
                    route_start, route_end = record.get('route_start', ''), record.get('route_end', '')

                await session.execute(text("""
                    INSERT INTO feedback (
                        id, trip_id, passenger_id, vehicle_id, city, route,
                        route_start, route_end, trip_time, trip_duration, rating,
                        feedback_text, feedback_pictures, feedback_videos,
                        feedback_type, sentiment, keywords, status,
                        feedback_channel, reply_text, reply_time, created_at, updated_at
                    ) VALUES (
                        :id, :trip_id, :passenger_id, :vehicle_id, :city, :route,
                        :route_start, :route_end, :trip_time, :trip_duration, :rating,
                        :feedback_text, :feedback_pictures, :feedback_videos,
                        :feedback_type, :sentiment, :keywords, :status,
                        :feedback_channel, :reply_text, :reply_time, :created_at, :updated_at
                    )
                """), {
                    'id': record['id'],
                    'trip_id': record.get('trip_id', ''),
                    'passenger_id': record.get('passenger_id', ''),
                    'vehicle_id': record.get('vehicle_id', ''),
                    'city': record.get('city', ''),
                    'route': route or f"{route_start} → {route_end}",
                    'route_start': route_start,
                    'route_end': route_end,
                    'trip_time': trip_time,
                    'trip_duration': record.get('trip_duration', 0),
                    'rating': record.get('rating', 5),
                    'feedback_text': record.get('feedback_text', ''),
                    'feedback_pictures': json.dumps(record.get('feedback_pictures', [])),
                    'feedback_videos': json.dumps(record.get('feedback_videos', [])),
                    'feedback_type': json.dumps(record.get('feedback_type', [])),
                    'sentiment': record.get('sentiment', 'neutral'),
                    'keywords': json.dumps(record.get('keywords', [])),
                    'status': status,
                    'feedback_channel': record.get('feedback_channel', 'App'),
                    'reply_text': record.get('reply_text') or None,
                    'reply_time': reply_time,
                    'created_at': trip_time,
                    'updated_at': trip_time,
                })
                success_count += 1
            except Exception as e:
                pass  # Skip errors

        await session.commit()

    return {"message": f"Initialized with {success_count} records", "source": str(json_path)}