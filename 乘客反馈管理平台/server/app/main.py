"""FastAPI application entry point."""

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import close_db, init_db
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