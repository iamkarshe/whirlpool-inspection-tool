"""Task row lifecycle, dispatch, and job_logs correlation."""

from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from mod.model import JobLog, JobLogStatus, Task, TaskLog, TaskStatus
from mod.tasks.celery_app import get_celery_app
from mod.tasks.constants import DEFAULT_MAX_ATTEMPTS, DEFAULT_TASK_QUEUE

TASK_JOB_LOG_PREFIX = "task:"


def safe_queue_name(value: str | None) -> str:
    name = (value or DEFAULT_TASK_QUEUE).strip()
    if not name or not name.replace("_", "").replace("-", "").isalnum():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="queue_name must be alphanumeric with optional dashes or underscores",
        )
    return name


def load_task_by_uuid(db: Session, task_uuid: uuid.UUID) -> Task | None:
    return (
        db.query(Task).filter(Task.uuid == task_uuid, Task.is_active.is_(True)).first()
    )


def get_task_by_uuid_or_404(db: Session, task_uuid: uuid.UUID) -> Task:
    task = load_task_by_uuid(db, task_uuid)
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    return task


def append_task_log(
    db: Session,
    *,
    task: Task,
    level: str,
    message: str,
    context: dict[str, Any] | None = None,
) -> None:
    db.add(
        TaskLog(
            task_id=task.id,
            level=level,
            message=message,
            context=context,
        )
    )


def task_job_log_metadata(task: Task) -> dict[str, Any]:
    payload = dict(task.payload or {})
    metadata: dict[str, Any] = {}
    if task.task_type == "resolve_ip_metadata":
        ip_address = payload.get("ip_address")
        if ip_address:
            metadata["ip_address"] = str(ip_address)
    return metadata


def persist_task_job_log(
    db: Session,
    *,
    task: Task,
    job_status: JobLogStatus,
    message: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    payload = {
        "task_uuid": str(task.uuid),
        "task_type": task.task_type,
        "task_status": task.status.value
        if hasattr(task.status, "value")
        else str(task.status),
        "attempts": task.attempts,
        "max_attempts": task.max_attempts,
        **task_job_log_metadata(task),
    }
    if metadata:
        payload.update(metadata)
    db.add(
        JobLog(
            uuid=uuid.uuid4(),
            job_name=f"{TASK_JOB_LOG_PREFIX}{task.task_type}",
            status=job_status,
            rows_updated=1 if job_status == JobLogStatus.success else 0,
            message=message[:4000] if message else None,
            metadata_json=payload,
            is_active=True,
        )
    )


def create_task_record(
    db: Session,
    *,
    task_type: str,
    payload: dict[str, Any],
    queue_name: str,
    max_attempts: int,
    created_by: str | None,
) -> Task:
    task = Task(
        uuid=uuid.uuid4(),
        task_type=task_type,
        status=TaskStatus.queued,
        queue_name=queue_name,
        payload=payload,
        max_attempts=max_attempts,
        created_by=created_by,
        is_active=True,
    )
    db.add(task)
    db.flush()
    append_task_log(
        db,
        task=task,
        level="info",
        message="Task queued",
        context={"task_type": task_type, "queue_name": queue_name},
    )
    db.commit()
    db.refresh(task)
    return task


def dispatch_task(task_uuid: uuid.UUID, queue_name: str) -> str:
    celery_app = get_celery_app()
    async_result = celery_app.send_task(
        "mod.tasks.worker.execute_task",
        args=[str(task_uuid)],
        queue=queue_name,
    )
    return str(async_result.id)


def attach_celery_task_id(db: Session, task: Task, celery_task_id: str) -> None:
    task.celery_task_id = celery_task_id
    db.commit()


def mark_task_processing(db: Session, task: Task) -> None:
    now = datetime.now(timezone.utc)
    task.status = TaskStatus.processing
    task.attempts = int(task.attempts or 0) + 1
    task.started_at = now
    task.progress_percent = 10
    task.progress_message = "Processing task"
    append_task_log(db, task=task, level="info", message="Task processing started")
    db.commit()


def mark_task_retrying(db: Session, task: Task, error_message: str) -> None:
    task.status = TaskStatus.retrying
    task.error_message = error_message[:4000]
    task.progress_message = "Retrying task"
    append_task_log(
        db,
        task=task,
        level="warning",
        message="Task will retry",
        context={"error": error_message[:500]},
    )
    db.commit()


def mark_task_completed(
    db: Session, task: Task, result: dict[str, Any], message: str
) -> None:
    now = datetime.now(timezone.utc)
    task.status = TaskStatus.completed
    task.result = result
    task.error_message = None
    task.completed_at = now
    task.progress_percent = 100
    task.progress_message = "Completed"
    append_task_log(db, task=task, level="info", message="Task completed")
    persist_task_job_log(
        db,
        task=task,
        job_status=JobLogStatus.success,
        message=message,
        metadata={"result_summary": list(result.keys())},
    )
    db.commit()


def mark_task_failed(
    db: Session, task: Task, error_message: str, *, permanent: bool
) -> None:
    now = datetime.now(timezone.utc)
    task.status = TaskStatus.failed
    task.error_message = error_message[:4000]
    task.failed_at = now
    task.progress_message = "Failed"
    append_task_log(
        db,
        task=task,
        level="error",
        message="Task failed permanently" if permanent else "Task failed",
        context={"error": error_message[:500]},
    )
    failure_metadata: dict[str, Any] = {"permanent": permanent}
    if task.task_type == "resolve_ip_metadata":
        failure_metadata["lookup_error"] = error_message[:500]
    persist_task_job_log(
        db,
        task=task,
        job_status=JobLogStatus.failed,
        message=error_message[:4000],
        metadata=failure_metadata,
    )
    db.commit()


def retry_countdown_seconds(attempts: int) -> int:
    base = min(60 * (2 ** max(attempts - 1, 0)), 600)
    jitter = secrets.randbelow(max(1, base // 4) + 1)
    return base + jitter


def should_retry_task(task: Task) -> bool:
    return int(task.attempts or 0) < int(task.max_attempts or DEFAULT_MAX_ATTEMPTS)


def update_task_progress(
    db: Session, task: Task, percent: int, message: str | None = None
) -> None:
    task.progress_percent = max(0, min(100, percent))
    if message:
        task.progress_message = message
    db.commit()
