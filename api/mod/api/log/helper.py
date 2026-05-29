import json
from typing import Any

from sqlalchemy import and_, or_
from sqlalchemy.orm import Query

from mod.api.log.response import ApplicationLogItemResponse, JobLogItemResponse
from mod.model import JobLog, Log, LogLevel

APPLICATION_LOG_SOURCES = frozenset(
    {"AUTH", "DEVICES", "INSPECTIONS", "MASTERS", "REPORTS", "STORAGE"}
)


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


def resolve_application_log_source(log: Log, payload: dict[str, Any]) -> str:
    raw_source = payload.get("source")
    if isinstance(raw_source, str) and raw_source.strip():
        return raw_source.strip().upper()

    event = str(payload.get("event", "")).strip().lower()
    if event in {"login", "login_failed"}:
        return "AUTH"

    if log.inspection_id is not None:
        return "INSPECTIONS"
    if log.device_id is not None:
        return "DEVICES"
    if log.product_id is not None:
        return "MASTERS"

    text = (log.log_value or "").lower()
    if any(token in text for token in ("s3", "storage", "upload")):
        return "STORAGE"
    if "report" in text:
        return "REPORTS"
    if log.user_id is not None:
        return "AUTH"
    return "SYSTEM"


def format_application_log_message(log: Log, payload: dict[str, Any]) -> str:
    explicit = payload.get("message")
    if isinstance(explicit, str) and explicit.strip():
        return explicit.strip()

    event = str(payload.get("event", "")).strip().lower()
    if event == "login":
        return "User login successful"
    if event == "login_failed":
        reason = payload.get("reason")
        if isinstance(reason, str) and reason.strip():
            return f"Login failed: {reason.strip()}"
        return "Multiple failed login attempts"

    raw = (log.log_value or "").strip()
    if raw and not raw.startswith("{"):
        return raw
    if event:
        return event.replace("_", " ").capitalize()
    return "Application event"


def map_application_log_item(log: Log) -> ApplicationLogItemResponse:
    payload = parse_log_payload(log.log_value)
    return ApplicationLogItemResponse(
        id=log.id,
        uuid=log.uuid,
        level=format_log_level(log.log_level),
        message=format_application_log_message(log, payload),
        source=resolve_application_log_source(log, payload),
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


def apply_application_log_source_filter(query: Query, source: str | None) -> Query:
    if not source:
        return query
    key = source.strip().upper()
    if key not in APPLICATION_LOG_SOURCES:
        return query

    if key == "AUTH":
        return query.filter(
            or_(
                Log.log_value.ilike('%"source": "AUTH"%'),
                Log.log_value.ilike('%"source":"AUTH"%'),
                Log.log_value.ilike('%"event": "login"%'),
                Log.log_value.ilike('%"event": "login_failed"%'),
                and_(
                    Log.user_id.isnot(None),
                    Log.inspection_id.is_(None),
                    Log.device_id.is_(None),
                    Log.product_id.is_(None),
                ),
            )
        )
    if key == "DEVICES":
        return query.filter(Log.device_id.isnot(None))
    if key == "INSPECTIONS":
        return query.filter(Log.inspection_id.isnot(None))
    if key == "MASTERS":
        return query.filter(
            and_(
                Log.product_id.isnot(None),
                Log.inspection_id.is_(None),
            )
        )
    if key == "STORAGE":
        return query.filter(
            or_(
                Log.log_value.ilike('%"source": "STORAGE"%'),
                Log.log_value.ilike('%"source":"STORAGE"%'),
                Log.log_value.ilike("%s3%"),
                Log.log_value.ilike("%storage%"),
                Log.log_value.ilike("%upload%"),
            )
        )
    if key == "REPORTS":
        return query.filter(
            or_(
                Log.log_value.ilike('%"source": "REPORTS"%'),
                Log.log_value.ilike('%"source":"REPORTS"%'),
                Log.log_value.ilike("%report%"),
            )
        )
    return query
