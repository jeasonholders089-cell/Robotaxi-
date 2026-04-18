"""API routes package."""

from app.api.feedback import router as feedback_router
from app.api.stats import router as stats_router
from app.api.ai import router as ai_router

__all__ = ["feedback_router", "stats_router", "ai_router"]
