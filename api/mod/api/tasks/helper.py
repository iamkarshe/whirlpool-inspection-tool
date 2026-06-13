import uuid
from datetime import datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from mod.api.integration.helper import load_credentials_payload
from mod.api.tasks.request import SampleSendEmailRequest, TaskCreateRequest
from mod.api.tasks.response import (
    TaskCreateResponse,
    TaskDetailResponse,
    TaskDisplayField,
    TaskDisplayGroup,
    TaskListItemResponse,
    TaskListResponse,
)
from mod.model import Task, TaskStatus
from mod.tasks.constants import (
    CREDENTIAL_KEY_DEFAULT_SMTP,
    SUPPORTED_TASK_TYPES,
    TASK_LIST_LIMIT,
)
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


def validate_notify_inspection_review_payload(payload: dict[str, Any]) -> None:
    raw_uuid = str(payload.get("inspection_uuid", "") or "").strip()
    if not raw_uuid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="notify_inspection_review_managers requires inspection_uuid",
        )
    try:
        uuid.UUID(raw_uuid)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="inspection_uuid must be a valid UUID",
        ) from exc


def validate_task_payload(task_type: str, payload: dict[str, Any]) -> None:
    if task_type == "send_email":
        validate_send_email_payload(payload)
        return
    if task_type == "notify_inspection_review_managers":
        validate_notify_inspection_review_payload(payload)
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


TASK_RESULT_FIELD_TAGS: dict[str, dict[str, str]] = {
    "send_email": {
        "success": "Success",
        "to_email": "To",
        "subject": "Subject",
        "status": "Status",
        "task_type": "Task Type",
    },
    "notify_inspection_review_managers": {
        "inspection_uuid": "Inspection",
        "warehouse_code": "Warehouse",
        "target_managers": "Managers",
        "emails_sent": "Emails Sent",
        "emails_failed": "Emails Failed",
        "managers_push_notified": "Push Notified",
    },
    "generate_report": {
        "status": "Status",
        "task_type": "Task Type",
    },
    "process_file": {
        "status": "Status",
        "task_type": "Task Type",
    },
    "send_webhook": {
        "status": "Status",
        "task_type": "Task Type",
    },
}

PAYLOAD_MESSAGE_FIELD_TAGS: dict[str, str] = {
    "to_email": "Requested To",
    "from_email": "Requested From",
    "subject": "Requested Subject",
    "credential_key": "Credential Key",
}


def format_task_display_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value).strip()


def append_display_field(
    fields: list[TaskDisplayField],
    *,
    tag: str,
    key: str,
    value: Any,
    group: TaskDisplayGroup,
) -> None:
    text = format_task_display_value(value)
    if not text:
        return
    fields.append(
        TaskDisplayField(
            tag=tag,
            key=key,
            value=text,
            group=group,
        )
    )


def dict_to_display_fields(
    data: dict[str, Any],
    tag_map: dict[str, str],
    group: TaskDisplayGroup,
) -> list[TaskDisplayField]:
    fields: list[TaskDisplayField] = []
    for key, value in data.items():
        if value is None or isinstance(value, (dict, list)):
            continue
        tag = tag_map.get(key, key.replace("_", " ").title())
        append_display_field(fields, tag=tag, key=key, value=value, group=group)
    return fields


def build_task_payload_preview_fields(task: Task) -> list[TaskDisplayField]:
    payload = task.payload if isinstance(task.payload, dict) else {}
    if task.task_type == "send_email":
        message = payload.get("message")
        if isinstance(message, dict):
            return dict_to_display_fields(
                message,
                PAYLOAD_MESSAGE_FIELD_TAGS,
                "payload",
            )
        credential_key = payload.get("credential_key")
        if credential_key:
            return [
                TaskDisplayField(
                    tag="Credential Key",
                    key="credential_key",
                    value=str(credential_key),
                    group="payload",
                )
            ]
    return []


def build_task_result_display_fields(task: Task) -> list[TaskDisplayField]:
    result = task.result if isinstance(task.result, dict) else {}
    if not result:
        return []
    tag_map = TASK_RESULT_FIELD_TAGS.get(
        task.task_type,
        {},
    )
    return dict_to_display_fields(result, tag_map, "result")


def build_task_display_fields(task: Task) -> list[TaskDisplayField]:
    status_value = task.status.value if hasattr(task.status, "value") else str(task.status)
    fields: list[TaskDisplayField] = []

    append_display_field(
        fields, tag="Task Type", key="task_type", value=task.task_type, group="status"
    )
    append_display_field(fields, tag="Status", key="status", value=status_value, group="status")
    append_display_field(
        fields,
        tag="Progress",
        key="progress_percent",
        value=f"{int(task.progress_percent or 0)}%",
        group="status",
    )
    append_display_field(
        fields,
        tag="Progress Message",
        key="progress_message",
        value=task.progress_message,
        group="status",
    )
    append_display_field(
        fields, tag="Queue", key="queue_name", value=task.queue_name, group="status"
    )
    append_display_field(
        fields, tag="Created By", key="created_by", value=task.created_by, group="status"
    )
    append_display_field(
        fields,
        tag="Attempts",
        key="attempts",
        value=f"{int(task.attempts or 0)} / {int(task.max_attempts or 3)}",
        group="status",
    )

    append_display_field(
        fields, tag="Created At", key="created_at", value=task.created_at, group="timing"
    )
    append_display_field(
        fields, tag="Updated At", key="updated_at", value=task.updated_at, group="timing"
    )
    append_display_field(
        fields, tag="Started At", key="started_at", value=task.started_at, group="timing"
    )
    append_display_field(
        fields,
        tag="Completed At",
        key="completed_at",
        value=task.completed_at,
        group="timing",
    )
    append_display_field(
        fields, tag="Failed At", key="failed_at", value=task.failed_at, group="timing"
    )

    fields.extend(build_task_payload_preview_fields(task))

    if task.error_message:
        append_display_field(
            fields,
            tag="Error",
            key="error_message",
            value=task.error_message,
            group="error",
        )

    fields.extend(build_task_result_display_fields(task))
    return fields


def task_result_message(task: Task, status_value: str) -> str | None:
    if status_value == TaskStatus.completed.value:
        return "Task completed successfully."
    if status_value == TaskStatus.failed.value:
        return task.error_message or "Task failed."
    if status_value == TaskStatus.cancelled.value:
        return "Task was cancelled."
    return "Task result is not available yet."


def map_task_list_item(task: Task) -> TaskListItemResponse:
    status_value = task.status.value if hasattr(task.status, "value") else str(task.status)
    return TaskListItemResponse(
        uuid=task.uuid,
        task_type=task.task_type,
        status=status_value,
        queue_name=task.queue_name,
        created_by=task.created_by,
        progress_percent=int(task.progress_percent or 0),
        progress_message=task.progress_message,
        attempts=int(task.attempts or 0),
        max_attempts=int(task.max_attempts or 3),
        error_message=task.error_message,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


def map_task_detail(task: Task) -> TaskDetailResponse:
    status_value = task.status.value if hasattr(task.status, "value") else str(task.status)
    terminal_statuses = {
        TaskStatus.completed.value,
        TaskStatus.failed.value,
        TaskStatus.cancelled.value,
    }
    result_ready = status_value in terminal_statuses
    result_success = status_value == TaskStatus.completed.value

    return TaskDetailResponse(
        uuid=task.uuid,
        task_type=task.task_type,
        status=status_value,
        queue_name=task.queue_name,
        created_by=task.created_by,
        progress_percent=int(task.progress_percent or 0),
        progress_message=task.progress_message,
        attempts=int(task.attempts or 0),
        max_attempts=int(task.max_attempts or 3),
        error_message=task.error_message,
        created_at=task.created_at,
        updated_at=task.updated_at,
        started_at=task.started_at,
        completed_at=task.completed_at,
        failed_at=task.failed_at,
        result_ready=result_ready,
        result_success=result_success,
        result_message=task_result_message(task, status_value),
        display_fields=build_task_display_fields(task),
    )


def list_recent_tasks(
    db: Session,
    *,
    task_type: str | None = None,
    status: str | None = None,
) -> TaskListResponse:
    query = db.query(Task).filter(Task.is_active.is_(True))

    if task_type is not None:
        normalized_type = task_type.strip()
        if normalized_type:
            query = query.filter(Task.task_type == normalized_type)

    if status is not None:
        normalized_status = status.strip().lower()
        if normalized_status:
            try:
                status_enum = TaskStatus(normalized_status)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid task status: {status}",
                )
            query = query.filter(Task.status == status_enum)

    rows = (
        query.order_by(Task.created_at.desc())
        .limit(TASK_LIST_LIMIT)
        .all()
    )
    return TaskListResponse(
        data=[map_task_list_item(task) for task in rows],
        total=len(rows),
    )
