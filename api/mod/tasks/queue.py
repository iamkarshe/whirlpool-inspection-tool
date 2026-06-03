"""Enqueue background tasks from application code (no HTTP)."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.orm import Session

from mod.tasks.constants import DEFAULT_MAX_ATTEMPTS, DEFAULT_TASK_QUEUE
from mod.tasks.service import (
    attach_celery_task_id,
    create_task_record,
    dispatch_task,
)


def enqueue_background_task(
    db: Session,
    *,
    task_type: str,
    payload: dict[str, Any],
    created_by: str | None = None,
    queue_name: str = DEFAULT_TASK_QUEUE,
    max_attempts: int = DEFAULT_MAX_ATTEMPTS,
) -> uuid.UUID:
    task = create_task_record(
        db,
        task_type=task_type,
        payload=payload,
        queue_name=queue_name,
        max_attempts=max_attempts,
        created_by=created_by,
    )
    celery_task_id = dispatch_task(task.uuid, queue_name)
    attach_celery_task_id(db, task, celery_task_id)
    return task.uuid


def try_enqueue_background_task(
    db: Session,
    *,
    task_type: str,
    payload: dict[str, Any],
    created_by: str | None = None,
) -> uuid.UUID | None:
    from utils.env import is_celery_broker_configured

    if not is_celery_broker_configured():
        return None
    return enqueue_background_task(
        db,
        task_type=task_type,
        payload=payload,
        created_by=created_by,
    )
