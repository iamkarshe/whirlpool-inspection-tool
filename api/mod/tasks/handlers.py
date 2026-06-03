"""Celery task type handlers."""

from __future__ import annotations

from typing import Any, Callable

from sqlalchemy.orm import Session

from mod.api.inspection.review_notifications import (
    execute_inspection_review_manager_notifications,
)
from mod.model import Task
from mod.tasks.email_send import resolve_smtp_config_from_payload, send_task_email
from mod.tasks.service import update_task_progress

Handler = Callable[[Session, Task], dict[str, Any]]


def handle_generate_report(db: Session, task: Task) -> dict[str, Any]:
    update_task_progress(db, task, 50, "Report handler placeholder")
    return {"status": "not_implemented", "task_type": "generate_report"}


def handle_process_file(db: Session, task: Task) -> dict[str, Any]:
    update_task_progress(db, task, 50, "File handler placeholder")
    return {"status": "not_implemented", "task_type": "process_file"}


def handle_send_webhook(db: Session, task: Task) -> dict[str, Any]:
    update_task_progress(db, task, 50, "Webhook handler placeholder")
    return {"status": "not_implemented", "task_type": "send_webhook"}


def handle_send_email(db: Session, task: Task) -> dict[str, Any]:
    payload = dict(task.payload or {})
    message = payload.get("message")
    if not isinstance(message, dict):
        raise ValueError("send_email payload requires message object")

    update_task_progress(db, task, 30, "Resolving SMTP configuration")
    smtp_config = resolve_smtp_config_from_payload(payload)

    update_task_progress(db, task, 60, "Sending email")
    send_task_email(smtp_config, message)

    to_email = str(message.get("to_email", "") or "").strip()
    return {
        "success": True,
        "to_email": to_email,
        "subject": str(message.get("subject", "") or "").strip(),
    }


def handle_notify_inspection_review_managers(db: Session, task: Task) -> dict[str, Any]:
    update_task_progress(db, task, 20, "Loading inspection and managers")
    payload = dict(task.payload or {})
    result = execute_inspection_review_manager_notifications(db, payload)
    update_task_progress(db, task, 100, "Inspection review notifications finished")
    return result


TASK_HANDLERS: dict[str, Handler] = {
    "send_email": handle_send_email,
    "notify_inspection_review_managers": handle_notify_inspection_review_managers,
    "generate_report": handle_generate_report,
    "process_file": handle_process_file,
    "send_webhook": handle_send_webhook,
}
