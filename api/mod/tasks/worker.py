"""Celery worker entrypoint for generic background tasks."""

from __future__ import annotations

import uuid

from mod.model import Task
from mod.tasks.celery_app import get_celery_app

celery_app = get_celery_app()
from mod.tasks.handlers import TASK_HANDLERS
from mod.tasks.service import (
    load_task_by_uuid,
    mark_task_completed,
    mark_task_failed,
    mark_task_processing,
    mark_task_retrying,
    retry_countdown_seconds,
    should_retry_task,
)
from utils.db import SessionLocal


@celery_app.task(bind=True, name="mod.tasks.worker.execute_task")
def execute_task(self, task_uuid: str) -> dict:
    db = SessionLocal()
    try:
        task = load_task_by_uuid(db, uuid.UUID(task_uuid))
        if task is None:
            raise ValueError(f"Task not found: {task_uuid}")

        handler = TASK_HANDLERS.get(task.task_type)
        if handler is None:
            raise ValueError(f"Unsupported task_type: {task.task_type}")

        mark_task_processing(db, task)
        db.refresh(task)

        result = handler(db, task)
        mark_task_completed(
            db,
            task,
            result,
            message=f"Task {task.task_type} completed",
        )
        return result
    except Exception as exc:
        db.rollback()
        task = load_task_by_uuid(db, uuid.UUID(task_uuid))
        if task is None:
            raise ValueError(f"Task not found after failure: {task_uuid}") from exc

        error_text = str(exc) or exc.__class__.__name__
        if should_retry_task(task):
            mark_task_retrying(db, task, error_text)
            countdown = retry_countdown_seconds(int(task.attempts or 1))
            raise self.retry(
                exc=exc,
                countdown=countdown,
                max_retries=int(task.max_attempts or 3) - 1,
            )
        mark_task_failed(db, task, error_text, permanent=True)
        raise
    finally:
        db.close()
