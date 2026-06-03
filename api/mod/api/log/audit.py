"""Structured application audit log writers (JSON in logs.log_value)."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from mod.model import Log, LogLevel

ACTION_AUTH_LOGIN = "auth_login"
ACTION_AUTH_LOGIN_FAILED = "auth_login_failed"
ACTION_USER_ADD = "user_add"
ACTION_USER_UPDATE = "user_update"
ACTION_MASTER_UPDATE = "master_update"
ACTION_INTEGRATION_KEY_UPDATED = "integration_key_updated"

SOURCE_AUTH = "AUTH"
SOURCE_USER_ADD = "USER_ADD"
SOURCE_USER_UPDATE = "USER_UPDATE"
SOURCE_MASTER_UPDATE = "MASTER_UPDATE"
SOURCE_INTEGRATION_KEY_UPDATED = "INTEGRATION_KEY_UPDATED"

SOURCE_DISPLAY_LABELS: dict[str, str] = {
    SOURCE_AUTH: "AUTH",
    SOURCE_USER_ADD: "USER ADD",
    SOURCE_USER_UPDATE: "USER UPDATE",
    SOURCE_MASTER_UPDATE: "MASTER UPDATE",
    SOURCE_INTEGRATION_KEY_UPDATED: "INTEGRATION KEY UPDATED",
}

ACTION_TO_SOURCE: dict[str, str] = {
    ACTION_AUTH_LOGIN: SOURCE_AUTH,
    ACTION_AUTH_LOGIN_FAILED: SOURCE_AUTH,
    ACTION_USER_ADD: SOURCE_USER_ADD,
    ACTION_USER_UPDATE: SOURCE_USER_UPDATE,
    ACTION_MASTER_UPDATE: SOURCE_MASTER_UPDATE,
    ACTION_INTEGRATION_KEY_UPDATED: SOURCE_INTEGRATION_KEY_UPDATED,
}

DEFAULT_ACTION_MESSAGES: dict[str, str] = {
    ACTION_AUTH_LOGIN: "User login successful",
    ACTION_AUTH_LOGIN_FAILED: "Login failed",
    ACTION_USER_ADD: "User account created",
    ACTION_USER_UPDATE: "User account updated",
    ACTION_MASTER_UPDATE: "Master data updated",
    ACTION_INTEGRATION_KEY_UPDATED: "Integration credentials updated",
}

APPLICATION_LOG_SOURCE_CODES = frozenset(SOURCE_DISPLAY_LABELS.keys())


def source_display_label(source_code: str) -> str:
    key = source_code.strip().upper()
    return SOURCE_DISPLAY_LABELS.get(key, source_code)


def record_application_log(
    db: Session,
    *,
    actor_user_id: int | None,
    level: LogLevel,
    action: str,
    message: str,
    device_id: int | None = None,
    **details: Any,
) -> None:
    source = ACTION_TO_SOURCE.get(action, SOURCE_AUTH)
    payload: dict[str, Any] = {
        "action": action,
        "source": source,
        "message": message,
        **details,
    }
    db.add(
        Log(
            user_id=actor_user_id,
            device_id=device_id,
            log_level=level.value if hasattr(level, "value") else str(level),
            log_value=json.dumps(payload, ensure_ascii=True),
        )
    )


def log_auth_login_success(
    db: Session,
    *,
    user_id: int,
    device_id: int | None,
    client_ip: str | None,
    proxy_ip: str | None,
    user_agent: str | None,
    access_token_preview: str | None,
    device_fingerprint: str | None,
    device_imei: str | None,
    attempted_email: str | None = None,
    login_method: str = "password",
    login_metadata: dict[str, Any] | None = None,
) -> None:
    details: dict[str, Any] = {
        "attempted_email": attempted_email,
        "login_email": attempted_email,
        "login_method": login_method,
    }
    if login_metadata:
        details["login_metadata"] = login_metadata
    record_application_log(
        db,
        actor_user_id=user_id,
        level=LogLevel.info,
        action=ACTION_AUTH_LOGIN,
        message=DEFAULT_ACTION_MESSAGES[ACTION_AUTH_LOGIN],
        device_id=device_id,
        ip=client_ip,
        proxy_ip=proxy_ip,
        user_agent=user_agent,
        access_token_preview=access_token_preview,
        device_fingerprint=device_fingerprint,
        device_imei=device_imei,
        **details,
    )


def log_auth_login_failed(
    db: Session,
    *,
    user_id: int | None,
    email: str | None,
    reason: str,
    client_ip: str | None,
    proxy_ip: str | None,
    user_agent: str | None,
    attempted_email: str | None = None,
    login_method: str = "password",
    login_metadata: dict[str, Any] | None = None,
) -> None:
    normalized_attempt = (attempted_email or email or "").strip().lower() or None
    message = reason.strip() or DEFAULT_ACTION_MESSAGES[ACTION_AUTH_LOGIN_FAILED]
    details: dict[str, Any] = {
        "reason": message,
        "attempted_email": normalized_attempt,
        "login_email": email,
        "login_method": login_method,
    }
    if login_metadata:
        details["login_metadata"] = login_metadata
    record_application_log(
        db,
        actor_user_id=user_id,
        level=LogLevel.warning,
        action=ACTION_AUTH_LOGIN_FAILED,
        message=message,
        ip=client_ip,
        proxy_ip=proxy_ip,
        user_agent=user_agent,
        email=email or normalized_attempt,
        **details,
    )


def log_user_added(
    db: Session,
    *,
    actor_user_id: int,
    target_user_uuid: str,
    target_email: str,
    target_name: str,
    target_role: str,
) -> None:
    record_application_log(
        db,
        actor_user_id=actor_user_id,
        level=LogLevel.info,
        action=ACTION_USER_ADD,
        message=f"User {target_name} ({target_email}) created with role {target_role}",
        target_user_uuid=target_user_uuid,
        target_email=target_email,
        target_role=target_role,
    )


def log_user_updated(
    db: Session,
    *,
    actor_user_id: int,
    target_user_uuid: str,
    target_email: str,
    summary: str,
) -> None:
    record_application_log(
        db,
        actor_user_id=actor_user_id,
        level=LogLevel.info,
        action=ACTION_USER_UPDATE,
        message=summary,
        target_user_uuid=target_user_uuid,
        target_email=target_email,
    )


def log_master_updated(
    db: Session,
    *,
    actor_user_id: int,
    resource_type: str,
    resource_key: str,
    operation: str,
    summary: str | None = None,
) -> None:
    message = summary or f"{resource_type} {resource_key} {operation}"
    record_application_log(
        db,
        actor_user_id=actor_user_id,
        level=LogLevel.info,
        action=ACTION_MASTER_UPDATE,
        message=message,
        resource_type=resource_type,
        resource_key=resource_key,
        operation=operation,
    )


def audit_master_from_request(
    db: Session,
    request: Any,
    *,
    resource_type: str,
    resource_key: str,
    operation: str,
    summary: str | None = None,
) -> None:
    log_master_updated(
        db,
        actor_user_id=int(request.state.user_id),
        resource_type=resource_type,
        resource_key=resource_key,
        operation=operation,
        summary=summary,
    )


def log_integration_keys_updated(
    db: Session,
    *,
    actor_user_id: int,
    integration: str,
) -> None:
    record_application_log(
        db,
        actor_user_id=actor_user_id,
        level=LogLevel.info,
        action=ACTION_INTEGRATION_KEY_UPDATED,
        message=f"{integration} integration credentials updated",
        integration=integration,
    )
