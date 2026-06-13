"""Structured application audit log writers (JSON in logs.log_value)."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from mod.api.ip_metadata.helper import schedule_ip_metadata_lookup
from mod.api.reports.kpi_parameters_cache import invalidate_kpi_parameters_cache
from mod.model import Log, LogLevel

ACTION_AUTH_LOGIN = "auth_login"
ACTION_AUTH_LOGIN_FAILED = "auth_login_failed"
ACTION_AUTH_FORGOT_PASSWORD = "auth_forgot_password"
ACTION_AUTH_FORGOT_PASSWORD_BLOCKED = "auth_forgot_password_blocked"
ACTION_AUTH_PASSWORD_RESET = "auth_password_reset"
ACTION_AUTH_PASSWORD_CHANGED = "auth_password_changed"
ACTION_USER_ONBOARD = "user_onboard"
ACTION_USER_ADD = "user_add"
ACTION_USER_UPDATE = "user_update"
ACTION_MASTER_UPDATE = "master_update"
ACTION_INTEGRATION_KEY_UPDATED = "integration_key_updated"
ACTION_EMAIL_SENT = "email_sent"
ACTION_EMAIL_FAILED = "email_failed"

SOURCE_AUTH = "AUTH"
SOURCE_USER_ONBOARD = "USER_ONBOARD"
SOURCE_USER_ADD = "USER_ADD"
SOURCE_USER_UPDATE = "USER_UPDATE"
SOURCE_MASTER_UPDATE = "MASTER_UPDATE"
SOURCE_INTEGRATION_KEY_UPDATED = "INTEGRATION_KEY_UPDATED"
SOURCE_EMAIL = "EMAIL"

SOURCE_DISPLAY_LABELS: dict[str, str] = {
    SOURCE_AUTH: "AUTH",
    SOURCE_USER_ADD: "USER ADD",
    SOURCE_USER_ONBOARD: "USER ONBOARD",
    SOURCE_USER_UPDATE: "USER UPDATE",
    SOURCE_MASTER_UPDATE: "MASTER UPDATE",
    SOURCE_INTEGRATION_KEY_UPDATED: "INTEGRATION KEY UPDATED",
    SOURCE_EMAIL: "EMAIL",
}

ACTION_TO_SOURCE: dict[str, str] = {
    ACTION_AUTH_LOGIN: SOURCE_AUTH,
    ACTION_AUTH_LOGIN_FAILED: SOURCE_AUTH,
    ACTION_AUTH_FORGOT_PASSWORD: SOURCE_AUTH,
    ACTION_AUTH_FORGOT_PASSWORD_BLOCKED: SOURCE_AUTH,
    ACTION_AUTH_PASSWORD_RESET: SOURCE_AUTH,
    ACTION_AUTH_PASSWORD_CHANGED: SOURCE_AUTH,
    ACTION_USER_ONBOARD: SOURCE_USER_ONBOARD,
    ACTION_USER_ADD: SOURCE_USER_ADD,
    ACTION_USER_UPDATE: SOURCE_USER_UPDATE,
    ACTION_MASTER_UPDATE: SOURCE_MASTER_UPDATE,
    ACTION_INTEGRATION_KEY_UPDATED: SOURCE_INTEGRATION_KEY_UPDATED,
    ACTION_EMAIL_SENT: SOURCE_EMAIL,
    ACTION_EMAIL_FAILED: SOURCE_EMAIL,
}

DEFAULT_ACTION_MESSAGES: dict[str, str] = {
    ACTION_AUTH_LOGIN: "User login successful",
    ACTION_AUTH_LOGIN_FAILED: "Login failed",
    ACTION_AUTH_FORGOT_PASSWORD: "Password reset requested",
    ACTION_AUTH_FORGOT_PASSWORD_BLOCKED: "Password reset IP blocked",
    ACTION_AUTH_PASSWORD_RESET: "Password reset completed",
    ACTION_AUTH_PASSWORD_CHANGED: "Password changed",
    ACTION_USER_ONBOARD: "User onboarded with welcome email",
    ACTION_USER_ADD: "User account created",
    ACTION_USER_UPDATE: "User account updated",
    ACTION_MASTER_UPDATE: "Master data updated",
    ACTION_INTEGRATION_KEY_UPDATED: "Integration credentials updated",
    ACTION_EMAIL_SENT: "Email sent",
    ACTION_EMAIL_FAILED: "Email delivery failed",
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
    schedule_ip_metadata_lookup(db, client_ip)


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
    schedule_ip_metadata_lookup(db, client_ip)


def log_auth_forgot_password_request(
    db: Session,
    *,
    user_id: int | None,
    client_ip: str | None,
    proxy_ip: str | None,
    user_agent: str | None,
    attempted_email: str | None,
    password_reset_request_uuid: str | None,
    email_sent: bool,
    skipped_reason: str | None = None,
) -> None:
    details: dict[str, Any] = {
        "attempted_email": attempted_email,
        "password_reset_request_uuid": password_reset_request_uuid,
        "email_sent": email_sent,
    }
    if skipped_reason:
        details["skipped_reason"] = skipped_reason
    record_application_log(
        db,
        actor_user_id=user_id,
        level=LogLevel.info if email_sent else LogLevel.warning,
        action=ACTION_AUTH_FORGOT_PASSWORD,
        message=DEFAULT_ACTION_MESSAGES[ACTION_AUTH_FORGOT_PASSWORD],
        ip=client_ip,
        proxy_ip=proxy_ip,
        user_agent=user_agent,
        **details,
    )
    schedule_ip_metadata_lookup(db, client_ip)


def log_auth_forgot_password_blocked(
    db: Session,
    *,
    client_ip: str | None,
    proxy_ip: str | None,
    user_agent: str | None,
    attempted_email: str | None,
    blocked_until: str,
    trigger_request_count: int,
    rejection_reason: str | None = None,
) -> None:
    details: dict[str, Any] = {
        "attempted_email": attempted_email,
        "blocked_until": blocked_until,
        "trigger_request_count": trigger_request_count,
    }
    if rejection_reason:
        details["rejection_reason"] = rejection_reason
    record_application_log(
        db,
        actor_user_id=None,
        level=LogLevel.error,
        action=ACTION_AUTH_FORGOT_PASSWORD_BLOCKED,
        message=DEFAULT_ACTION_MESSAGES[ACTION_AUTH_FORGOT_PASSWORD_BLOCKED],
        ip=client_ip,
        proxy_ip=proxy_ip,
        user_agent=user_agent,
        **details,
    )
    schedule_ip_metadata_lookup(db, client_ip)


def log_auth_password_reset_completed(
    db: Session,
    *,
    user_id: int,
    client_ip: str | None,
    proxy_ip: str | None,
    user_agent: str | None,
    password_reset_request_uuid: str,
) -> None:
    record_application_log(
        db,
        actor_user_id=user_id,
        level=LogLevel.info,
        action=ACTION_AUTH_PASSWORD_RESET,
        message=DEFAULT_ACTION_MESSAGES[ACTION_AUTH_PASSWORD_RESET],
        ip=client_ip,
        proxy_ip=proxy_ip,
        user_agent=user_agent,
        password_reset_request_uuid=password_reset_request_uuid,
    )
    schedule_ip_metadata_lookup(db, client_ip)


def log_auth_password_changed(
    db: Session,
    *,
    user_id: int,
    client_ip: str | None,
    proxy_ip: str | None,
    user_agent: str | None,
    change_reason: str,
) -> None:
    record_application_log(
        db,
        actor_user_id=user_id,
        level=LogLevel.info,
        action=ACTION_AUTH_PASSWORD_CHANGED,
        message=DEFAULT_ACTION_MESSAGES[ACTION_AUTH_PASSWORD_CHANGED],
        ip=client_ip,
        proxy_ip=proxy_ip,
        user_agent=user_agent,
        change_reason=change_reason,
    )
    schedule_ip_metadata_lookup(db, client_ip)


def log_user_onboarded(
    db: Session,
    *,
    actor_user_id: int,
    target_user_uuid: str,
    target_email: str,
    target_name: str,
    target_role: str,
    welcome_email_sent: bool,
) -> None:
    record_application_log(
        db,
        actor_user_id=actor_user_id,
        level=LogLevel.info,
        action=ACTION_USER_ONBOARD,
        message=DEFAULT_ACTION_MESSAGES[ACTION_USER_ONBOARD],
        target_user_uuid=target_user_uuid,
        target_email=target_email,
        target_name=target_name,
        target_role=target_role,
        welcome_email_sent=welcome_email_sent,
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

    invalidate_kpi_parameters_cache()


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


def log_email_delivery(
    db: Session,
    *,
    actor_user_id: int | None,
    email_kind: str,
    to_email: str,
    from_email: str,
    subject: str,
    body_text: str,
    body_html: str | None = None,
    delivery_mode: str,
    success: bool,
    error_message: str | None = None,
    task_uuid: str | None = None,
    created_by: str | None = None,
) -> None:
    summary = f"Email sent to {to_email}: {subject}" if success else (
        f"Email failed to {to_email}: {subject}"
    )
    if error_message:
        summary = f"{summary} ({error_message[:200]})"

    details: dict[str, Any] = {
        "email_kind": email_kind,
        "to_email": to_email,
        "from_email": from_email,
        "subject": subject,
        "body_text": body_text,
        "body_html": body_html or "",
        "delivery_mode": delivery_mode,
        "task_uuid": task_uuid,
        "created_by": created_by,
    }
    if error_message:
        details["error_message"] = error_message[:2000]

    record_application_log(
        db,
        actor_user_id=actor_user_id,
        level=LogLevel.info if success else LogLevel.error,
        action=ACTION_EMAIL_SENT if success else ACTION_EMAIL_FAILED,
        message=summary,
        **details,
    )
