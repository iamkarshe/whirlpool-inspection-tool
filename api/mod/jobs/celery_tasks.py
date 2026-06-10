"""Scheduled Celery jobs (replaces crontab when beat is running)."""

from __future__ import annotations

from mod.jobs.helper import (
    execute_auto_approve_inspections,
    execute_resolve_pending_ip_metadata,
)
from mod.tasks.celery_app import get_celery_app
from utils.db import SessionLocal

celery_app = get_celery_app()


@celery_app.task(name="mod.jobs.celery_tasks.auto_approve_inspections")
def auto_approve_inspections_task() -> dict:
    db = SessionLocal()
    try:
        result = execute_auto_approve_inspections(db)
        return {
            "job_name": result.job_name,
            "rows_updated": result.rows_updated,
            "message": result.message,
            "logged": result.logged,
        }
    finally:
        db.close()


@celery_app.task(name="mod.jobs.celery_tasks.resolve_pending_ip_metadata")
def resolve_pending_ip_metadata_task() -> dict:
    db = SessionLocal()
    try:
        result = execute_resolve_pending_ip_metadata(db)
        return {
            "job_name": result.job_name,
            "rows_updated": result.rows_updated,
            "message": result.message,
            "logged": result.logged,
        }
    finally:
        db.close()
