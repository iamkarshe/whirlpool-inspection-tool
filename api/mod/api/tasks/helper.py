import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from mod.api.integration.helper import load_credentials_payload
from mod.api.tasks.request import SampleSendEmailRequest, TaskCreateRequest
from mod.api.tasks.response import (
    TaskCreateResponse,
    TaskResultResponse,
    TaskStatusResponse,
)
from mod.model import Task, TaskStatus
from mod.tasks.constants import CREDENTIAL_KEY_DEFAULT_SMTP, SUPPORTED_TASK_TYPES
from mod.tasks.service import (
    attach_celery_task_id,
    create_task_record,
    dispatch_task,
    get_task_by_uuid_or_404,
    safe_queue_name,
)
from utils.env import is_celery_broker_configured


def validate_send_email_payload(payload: dict[str, Any]) -> None:
    message = payload.get("message")
    if not isinstance(message, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="send_email requires payload.message",
        )

    to_email = str(message.get("to_email", "") or "").strip()
    from_email = str(message.get("from_email", "") or "").strip()
    subject = str(message.get("subject", "") or "").strip()
    body_text = str(message.get("body_text", "") or "").strip()
    body_html = str(message.get("body_html", "") or "").strip()

    if not to_email or not from_email or not subject:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="message.to_email, message.from_email, and message.subject are required",
        )
    if not body_text and not body_html:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="message.body_text or message.body_html is required",
        )

    credential_key = str(payload.get("credential_key", "") or "").strip()
    smtp_section = payload.get("smtp")
    if credential_key:
        if credential_key != CREDENTIAL_KEY_DEFAULT_SMTP:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported credential_key: {credential_key}",
            )
        return

    if not isinstance(smtp_section, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="send_email requires credential_key or smtp configuration",
        )

    host = str(smtp_section.get("host", "") or "").strip()
    port = smtp_section.get("port")
    encryption = str(smtp_section.get("encryption", "") or "").strip().lower()
    if encryption == "ssl_tls":
        encryption = "ssl"
    if encryption not in {"starttls", "ssl", "none"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="smtp.encryption must be starttls, ssl_tls, ssl, or none",
        )
    if not host or port is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="smtp.host and smtp.port are required without credential_key",
        )
    if "auth_enabled" in smtp_section and not isinstance(
        smtp_section.get("auth_enabled"), bool
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="smtp.auth_enabled must be boolean",
        )


def validate_task_payload(task_type: str, payload: dict[str, Any]) -> None:
    if task_type == "send_email":
        validate_send_email_payload(payload)
        return
    if task_type not in SUPPORTED_TASK_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported task_type: {task_type}",
        )


def ensure_celery_broker_ready() -> None:
    if not is_celery_broker_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="REDIS_URL is not configured; background tasks are unavailable",
        )


def queue_task(
    db: Session,
    request_body: TaskCreateRequest,
    *,
    created_by: str | None,
) -> TaskCreateResponse:
    ensure_celery_broker_ready()
    validate_task_payload(request_body.task_type, request_body.payload)
    queue_name = safe_queue_name(request_body.queue_name)

    task = create_task_record(
        db,
        task_type=request_body.task_type,
        payload=request_body.payload,
        queue_name=queue_name,
        max_attempts=request_body.max_attempts,
        created_by=created_by,
    )
    celery_task_id = dispatch_task(task.uuid, queue_name)
    attach_celery_task_id(db, task, celery_task_id)

    return TaskCreateResponse(
        task_uuid=task.uuid,
        status=TaskStatus.queued.value,
    )


def build_sample_send_email_payload(body: SampleSendEmailRequest) -> dict[str, Any]:
    smtp = load_credentials_payload().get("smtp", {})
    if not isinstance(smtp, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="SMTP credentials are not configured",
        )
    from_email = str(smtp.get("from_email", "") or "").strip()
    from_name = str(smtp.get("from_name", "") or "").strip()
    if not from_email:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="SMTP from_email is not configured",
        )

    message: dict[str, Any] = {
        "from_email": from_email,
        "from_name": from_name,
        "to_email": str(body.to_email),
        "subject": body.subject.strip(),
        "body_text": body.body_text.strip(),
    }
    if body.body_html and body.body_html.strip():
        message["body_html"] = body.body_html.strip()

    return {
        "credential_key": body.credential_key,
        "message": message,
    }


def queue_sample_send_email_task(
    db: Session,
    body: SampleSendEmailRequest,
    *,
    created_by: str | None,
) -> TaskCreateResponse:
    payload = build_sample_send_email_payload(body)
    request_body = TaskCreateRequest(
        task_type="send_email",
        payload=payload,
        queue_name=body.queue_name,
    )
    return queue_task(db, request_body, created_by=created_by)


def map_task_status(task: Task) -> TaskStatusResponse:
    status_value = task.status.value if hasattr(task.status, "value") else str(task.status)
    return TaskStatusResponse(
        uuid=task.uuid,
        task_type=task.task_type,
        status=status_value,
        progress_percent=int(task.progress_percent or 0),
        progress_message=task.progress_message,
        attempts=int(task.attempts or 0),
        max_attempts=int(task.max_attempts or 3),
        result=task.result,
        error_message=task.error_message,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


def map_task_result(task: Task) -> TaskResultResponse:
    status_value = task.status.value if hasattr(task.status, "value") else str(task.status)
    if status_value == TaskStatus.completed.value:
        return TaskResultResponse(
            success=True,
            task_uuid=task.uuid,
            status=status_value,
            result=task.result,
        )
    return TaskResultResponse(
        success=False,
        task_uuid=task.uuid,
        status=status_value,
        result=None,
        message="Task result is not available yet.",
    )
