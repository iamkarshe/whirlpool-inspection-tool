import json
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Query

from mod.api.log.audit import (
    ACTION_AUTH_LOGIN,
    ACTION_AUTH_LOGIN_FAILED,
    ACTION_EMAIL_FAILED,
    ACTION_EMAIL_SENT,
    ACTION_INTEGRATION_KEY_UPDATED,
    ACTION_MASTER_UPDATE,
    ACTION_USER_ADD,
    ACTION_USER_ONBOARD,
    ACTION_USER_UPDATE,
    APPLICATION_LOG_SOURCE_CODES,
    DEFAULT_ACTION_MESSAGES,
    SOURCE_AUTH,
    SOURCE_DISPLAY_LABELS,
    SOURCE_EMAIL,
    SOURCE_INTEGRATION_KEY_UPDATED,
    SOURCE_MASTER_UPDATE,
    SOURCE_USER_ADD,
    SOURCE_USER_ONBOARD,
    SOURCE_USER_UPDATE,
    source_display_label,
)
from mod.api.log.response import ApplicationLogItemResponse, JobLogItemResponse
from mod.model import JobLog, Log, LogLevel


def parse_log_payload(raw_value: str) -> dict[str, Any]:
    try:
        payload = json.loads(raw_value) if raw_value else {}
        return payload if isinstance(payload, dict) else {}
    except json.JSONDecodeError:
        return {}


def format_log_level(level: LogLevel | str) -> str:
    value = level.value if hasattr(level, "value") else str(level)
    labels = {
        LogLevel.info.value: "INFO",
        LogLevel.warning.value: "WARN",
        LogLevel.error.value: "ERROR",
        LogLevel.debug.value: "DEBUG",
    }
    return labels.get(value.lower(), value.upper())


def resolve_application_log_source(_log: Log, payload: dict[str, Any]) -> str:
    raw_source = payload.get("source")
    if isinstance(raw_source, str) and raw_source.strip():
        return source_display_label(raw_source)

    action = str(payload.get("action", "")).strip().lower()
    if action in {ACTION_AUTH_LOGIN, ACTION_AUTH_LOGIN_FAILED}:
        return source_display_label(SOURCE_AUTH)
    if action == ACTION_USER_ADD:
        return source_display_label(SOURCE_USER_ADD)
    if action == ACTION_USER_ONBOARD:
        return source_display_label(SOURCE_USER_ONBOARD)
    if action == ACTION_USER_UPDATE:
        return source_display_label(SOURCE_USER_UPDATE)
    if action in {ACTION_EMAIL_SENT, ACTION_EMAIL_FAILED}:
        return source_display_label(SOURCE_EMAIL)
    if action == ACTION_MASTER_UPDATE:
        return source_display_label(SOURCE_MASTER_UPDATE)
    if action == ACTION_INTEGRATION_KEY_UPDATED:
        return source_display_label(SOURCE_INTEGRATION_KEY_UPDATED)

    event = str(payload.get("event", "")).strip().lower()
    if event in {"login", "login_failed"}:
        return source_display_label(SOURCE_AUTH)
    return "SYSTEM"


def format_application_log_message(_log: Log, payload: dict[str, Any]) -> str:
    explicit = payload.get("message")
    if isinstance(explicit, str) and explicit.strip():
        return explicit.strip()

    action = str(payload.get("action", "")).strip().lower()
    if action in DEFAULT_ACTION_MESSAGES:
        default = DEFAULT_ACTION_MESSAGES[action]
        if action == ACTION_AUTH_LOGIN_FAILED:
            attempted = payload.get("attempted_email") or payload.get("email")
            reason = payload.get("reason")
            if isinstance(attempted, str) and attempted.strip():
                email_label = attempted.strip()
                if isinstance(reason, str) and reason.strip():
                    return f"Login failed for {email_label}: {reason.strip()}"
                return f"Login failed for {email_label}"
            if isinstance(reason, str) and reason.strip():
                return reason.strip()
        if action == ACTION_AUTH_LOGIN:
            attempted = payload.get("attempted_email") or payload.get("login_email")
            if isinstance(attempted, str) and attempted.strip():
                return f"User login successful ({attempted.strip()})"
        if action in {ACTION_EMAIL_SENT, ACTION_EMAIL_FAILED}:
            to_email = payload.get("to_email")
            subject = payload.get("subject")
            if isinstance(to_email, str) and isinstance(subject, str):
                prefix = "Email sent" if action == ACTION_EMAIL_SENT else "Email failed"
                return f"{prefix} to {to_email.strip()}: {subject.strip()}"
        return default

    event = str(payload.get("event", "")).strip().lower()
    if event == "login":
        return DEFAULT_ACTION_MESSAGES[ACTION_AUTH_LOGIN]
    if event == "login_failed":
        reason = payload.get("reason")
        if isinstance(reason, str) and reason.strip():
            return reason.strip()
        return DEFAULT_ACTION_MESSAGES[ACTION_AUTH_LOGIN_FAILED]

    raw = (_log.log_value or "").strip()
    if raw and not raw.startswith("{"):
        return raw
    if action:
        return action.replace("_", " ").upper()
    return "Application event"


def map_application_log_item(log: Log) -> ApplicationLogItemResponse:
    payload = parse_log_payload(log.log_value)
    return ApplicationLogItemResponse(
        id=log.id,
        uuid=log.uuid,
        level=format_log_level(log.log_level),
        message=format_application_log_message(log, payload),
        source=resolve_application_log_source(log, payload),
        details=payload or None,
        created_at=log.created_at,
    )


def map_job_log_item(row: JobLog) -> JobLogItemResponse:
    status = row.status.value if hasattr(row.status, "value") else str(row.status)
    return JobLogItemResponse(
        id=row.id,
        uuid=row.uuid,
        job_name=row.job_name,
        status=status,
        rows_updated=int(row.rows_updated or 0),
        message=row.message,
        metadata=row.metadata_json if isinstance(row.metadata_json, dict) else None,
        created_at=row.created_at,
    )


def apply_application_log_level_filter(query: Query, level: str | None) -> Query:
    if not level:
        return query
    normalized = level.strip().lower()
    level_map = {
        "info": LogLevel.info,
        "warn": LogLevel.warning,
        "warning": LogLevel.warning,
        "error": LogLevel.error,
        "debug": LogLevel.debug,
    }
    enum_level = level_map.get(normalized)
    if enum_level is None:
        return query
    return query.filter(Log.log_level == enum_level)


def _source_json_match(source_code: str) -> list:
    return [
        Log.log_value.ilike(f'%"source": "{source_code}"%'),
        Log.log_value.ilike(f'%"source":"{source_code}"%'),
    ]


def apply_application_log_source_filter(query: Query, source: str | None) -> Query:
    if not source:
        return query
    key = source.strip().upper().replace(" ", "_")
    if key not in APPLICATION_LOG_SOURCE_CODES:
        label = source.strip().upper()
        for code, display in SOURCE_DISPLAY_LABELS.items():
            if display == label:
                key = code
                break
    if key not in APPLICATION_LOG_SOURCE_CODES:
        return query

    if key == SOURCE_AUTH:
        return query.filter(
            or_(
                *_source_json_match(SOURCE_AUTH),
                Log.log_value.ilike(f'%"action": "{ACTION_AUTH_LOGIN}"%'),
                Log.log_value.ilike(f'%"action": "{ACTION_AUTH_LOGIN_FAILED}"%'),
                Log.log_value.ilike('%"event": "login"%'),
                Log.log_value.ilike('%"event": "login_failed"%'),
            )
        )
    if key == SOURCE_USER_ADD:
        return query.filter(
            or_(
                *_source_json_match(SOURCE_USER_ADD),
                Log.log_value.ilike(f'%"action": "{ACTION_USER_ADD}"%'),
            )
        )
    if key == SOURCE_USER_ONBOARD:
        return query.filter(
            or_(
                *_source_json_match(SOURCE_USER_ONBOARD),
                Log.log_value.ilike(f'%"action": "{ACTION_USER_ONBOARD}"%'),
            )
        )
    if key == SOURCE_USER_UPDATE:
        return query.filter(
            or_(
                *_source_json_match(SOURCE_USER_UPDATE),
                Log.log_value.ilike(f'%"action": "{ACTION_USER_UPDATE}"%'),
            )
        )
    if key == SOURCE_MASTER_UPDATE:
        return query.filter(
            or_(
                *_source_json_match(SOURCE_MASTER_UPDATE),
                Log.log_value.ilike(f'%"action": "{ACTION_MASTER_UPDATE}"%'),
            )
        )
    if key == SOURCE_INTEGRATION_KEY_UPDATED:
        return query.filter(
            or_(
                *_source_json_match(SOURCE_INTEGRATION_KEY_UPDATED),
                Log.log_value.ilike(f'%"action": "{ACTION_INTEGRATION_KEY_UPDATED}"%'),
            )
        )
    if key == SOURCE_EMAIL:
        return query.filter(
            or_(
                *_source_json_match(SOURCE_EMAIL),
                Log.log_value.ilike(f'%"action": "{ACTION_EMAIL_SENT}"%'),
                Log.log_value.ilike(f'%"action": "{ACTION_EMAIL_FAILED}"%'),
            )
        )
    return query
