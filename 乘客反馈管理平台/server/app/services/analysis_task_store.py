"""In-memory task storage for AI analysis tasks, with database persistence."""

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal


@dataclass
class AnalysisTask:
    """Represents an AI analysis task."""

    task_id: str
    status: str = "pending"
    progress: int = 0
    filters: dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)

    summary: Optional[str] = None
    problems: Optional[list] = None
    suggestions: Optional[list] = None
    analyzed_count: int = 0
    error: Optional[str] = None


# In-memory task storage (cache)
_tasks: dict[str, AnalysisTask] = {}

# Running background tasks
_running_tasks: dict[str, asyncio.Task] = {}

# Shutdown event for graceful shutdown
_shutdown_event = asyncio.Event()


def create_task(filters: dict) -> str:
    """Create a new analysis task and return its ID."""
    task_id = str(uuid.uuid4())[:8]
    _tasks[task_id] = AnalysisTask(task_id=task_id, filters=filters)
    return task_id


def get_task(task_id: str) -> Optional[AnalysisTask]:
    """Get a task by ID."""
    return _tasks.get(task_id)


def update_task_progress(task_id: str, progress: int, status: str = None) -> None:
    """Update task progress."""
    import sys
    print(f"DEBUG update_task_progress: task_id={task_id}, progress={progress}, status={status}", file=sys.stderr)
    sys.stderr.flush()
    task = _tasks.get(task_id)
    if task:
        task.progress = progress
        if status:
            task.status = status

    # Persist to DB in background
    asyncio.create_task(_persist_progress(task_id, progress, status))


async def _persist_progress(task_id: str, progress: int, status: str = None) -> None:
    """Persist progress to database."""
    from app.models.analysis_task import AnalysisTaskResult

    async with AsyncSessionLocal() as session:
        try:
            # Check if record exists
            result = await session.execute(
                select(AnalysisTaskResult).where(AnalysisTaskResult.task_id == task_id)
            )
            existing = result.scalar_one_or_none()

            if existing:
                await session.execute(
                    update(AnalysisTaskResult)
                    .where(AnalysisTaskResult.task_id == task_id)
                    .values(progress=progress, status=status or existing.status)
                )
            else:
                # Create new record
                session.add(AnalysisTaskResult(
                    task_id=task_id,
                    status=status or "processing",
                    progress=progress,
                    filters=_tasks.get(task_id).filters if _tasks.get(task_id) else {},
                ))
            await session.commit()
        except Exception as e:
            await session.rollback()
            import sys
            print(f"DEBUG _persist_progress failed: {e}", file=sys.stderr)
            sys.stderr.flush()


def set_task_result(
    task_id: str,
    summary: str,
    problems: list,
    suggestions: list,
    analyzed_count: int,
) -> None:
    """Set task completion result."""
    task = _tasks.get(task_id)
    if task:
        task.summary = summary
        task.problems = problems
        task.suggestions = suggestions
        task.analyzed_count = analyzed_count
        task.status = "completed"
        task.progress = 100

    # Persist to database
    asyncio.create_task(_persist_result(task_id, summary, problems, suggestions, analyzed_count))


async def _persist_result(
    task_id: str,
    summary: str,
    problems: list,
    suggestions: list,
    analyzed_count: int,
) -> None:
    """Persist task result to database."""
    from app.models.analysis_task import AnalysisTaskResult

    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(AnalysisTaskResult).where(AnalysisTaskResult.task_id == task_id)
            )
            existing = result.scalar_one_or_none()

            if existing:
                await session.execute(
                    update(AnalysisTaskResult)
                    .where(AnalysisTaskResult.task_id == task_id)
                    .values(
                        summary=summary,
                        problems=problems,
                        suggestions=suggestions,
                        analyzed_count=analyzed_count,
                        status="completed",
                        progress=100,
                    )
                )
            else:
                session.add(AnalysisTaskResult(
                    task_id=task_id,
                    status="completed",
                    progress=100,
                    filters=_tasks.get(task_id).filters if _tasks.get(task_id) else {},
                    summary=summary,
                    problems=problems,
                    suggestions=suggestions,
                    analyzed_count=analyzed_count,
                ))
            await session.commit()
        except Exception as e:
            await session.rollback()
            import sys
            print(f"DEBUG _persist_result failed: {e}", file=sys.stderr)
            sys.stderr.flush()


def set_task_error(task_id: str, error: str) -> None:
    """Set task error."""
    import sys
    print(f"DEBUG set_task_error: task_id={task_id}, error={error[:200] if error else 'None'}", file=sys.stderr)
    sys.stderr.flush()
    task = _tasks.get(task_id)
    if task:
        task.error = error
        task.status = "failed"

    # Persist to database
    asyncio.create_task(_persist_error(task_id, error))


async def _persist_error(task_id: str, error: str) -> None:
    """Persist task error to database."""
    from app.models.analysis_task import AnalysisTaskResult

    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(AnalysisTaskResult).where(AnalysisTaskResult.task_id == task_id)
            )
            existing = result.scalar_one_or_none()

            if existing:
                await session.execute(
                    update(AnalysisTaskResult)
                    .where(AnalysisTaskResult.task_id == task_id)
                    .values(error=error, status="failed")
                )
            else:
                session.add(AnalysisTaskResult(
                    task_id=task_id,
                    status="failed",
                    progress=0,
                    filters=_tasks.get(task_id).filters if _tasks.get(task_id) else {},
                    error=error,
                ))
            await session.commit()
        except Exception as e:
            await session.rollback()
            import sys
            print(f"DEBUG _persist_error failed: {e}", file=sys.stderr)
            sys.stderr.flush()


def register_running_task(task_id: str, task: asyncio.Task) -> None:
    """Register a running background task."""
    _running_tasks[task_id] = task


def unregister_running_task(task_id: str) -> None:
    """Unregister a background task."""
    _running_tasks.pop(task_id, None)


def cancel_task(task_id: str) -> bool:
    """Cancel a running task."""
    task = _running_tasks.get(task_id)
    if task:
        task.cancel()
        unregister_running_task(task_id)
        set_task_error(task_id, "Task cancelled by user")
        return True
    return False


def initiate_graceful_shutdown() -> None:
    """Initiate graceful shutdown - signal all tasks to complete."""
    _shutdown_event.set()


async def wait_for_tasks_to_complete(timeout: float = 60.0) -> None:
    """Wait for all running analysis tasks to complete or timeout."""
    if not _running_tasks:
        return

    import sys
    print(f"DEBUG wait_for_tasks_to_complete: {len(_running_tasks)} tasks running", file=sys.stderr)
    sys.stderr.flush()

    # Wait for all running tasks with timeout
    try:
        await asyncio.wait_for(
            asyncio.gather(*_running_tasks.values(), return_exceptions=True),
            timeout=timeout,
        )
    except asyncio.TimeoutError:
        import sys
        print(f"DEBUG wait_for_tasks_to_complete: timeout after {timeout}s, cancelling remaining tasks", file=sys.stderr)
        sys.stderr.flush()
        for task in _running_tasks.values():
            if not task.done():
                task.cancel()


def get_task_from_db(task_id: str) -> Optional[dict]:
    """Load task state from database."""
    from app.models.analysis_task import AnalysisTaskResult

    async def _load():
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(AnalysisTaskResult).where(AnalysisTaskResult.task_id == task_id)
            )
            record = result.scalar_one_or_none()
            if record:
                return {
                    "task_id": record.task_id,
                    "status": record.status,
                    "progress": record.progress,
                    "filters": record.filters,
                    "summary": record.summary,
                    "problems": record.problems,
                    "suggestions": record.suggestions,
                    "analyzed_count": record.analyzed_count,
                    "error": record.error,
                }
            return None

    # Run the sync version
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Create a new event loop for this sync call
            return asyncio.run(_load())
        else:
            return asyncio.run(_load())
    except Exception:
        return None


def sync_task_from_db(task_id: str) -> bool:
    """Synchronize task state from database to memory."""
    record = get_task_from_db(task_id)
    if record:
        task = AnalysisTask(
            task_id=record["task_id"],
            status=record["status"],
            progress=record["progress"],
            filters=record.get("filters", {}),
            summary=record.get("summary"),
            problems=record.get("problems"),
            suggestions=record.get("suggestions"),
            analyzed_count=record.get("analyzed_count", 0),
            error=record.get("error"),
        )
        _tasks[task_id] = task
        return True
    return False
