"""Scheduled Celery jobs (replaces crontab when beat is running)."""

from __future__ import annotations

from mod.jobs.helper import (
    execute_auto_approve_inspections,
    execute_resolve_pending_ip_metadata,
)
from mod.jobs.onboard_emails import executeBulkOnboardEmails
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


@celery_app.task(name="mod.jobs.celery_tasks.bulk_onboard_emails")
def bulk_onboard_emails_task() -> dict:
    db = SessionLocal()
    try:
        result = executeBulkOnboardEmails(db)
        return {
            "job_name": result.job_name,
            "pending_count": result.pending_count,
            "sent_count": result.sent_count,
            "failed_count": result.failed_count,
            "message": result.message,
            "logged": result.logged,
            "results": [
                {
                    "user_uuid": item.user_uuid,
                    "email": item.email,
                    "name": item.name,
                    "welcome_email_sent": item.welcome_email_sent,
                    "error": item.error,
                }
                for item in result.results
            ],
        }
    finally:
        db.close()
