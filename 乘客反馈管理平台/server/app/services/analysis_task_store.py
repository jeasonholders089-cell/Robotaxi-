"""In-memory task storage for AI analysis tasks."""

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession


@dataclass
class AnalysisTask:
    """Represents an AI analysis task."""

    task_id: str
    status: str = "pending"  # pending | processing | completed | failed
    progress: int = 0  # 0-100
    filters: dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)

    # Results
    summary: Optional[str] = None
    problems: Optional[list] = None
    suggestions: Optional[list] = None
    analyzed_count: int = 0
    error: Optional[str] = None


# In-memory task storage
_tasks: dict[str, AnalysisTask] = {}

# Running background tasks
_running_tasks: dict[str, asyncio.Task] = {}


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
    print(f"DEBUG update_task_progress: progress type={type(progress)}", file=sys.stderr)
    sys.stderr.flush()
    task = _tasks.get(task_id)
    if task:
        task.progress = progress
        if status:
            task.status = status


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


def set_task_error(task_id: str, error: str) -> None:
    """Set task error."""
    import sys
    print(f"DEBUG set_task_error: task_id={task_id}, error={error[:200] if error else 'None'}", file=sys.stderr)
    sys.stderr.flush()
    task = _tasks.get(task_id)
    if task:
        task.error = error
        task.status = "failed"


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