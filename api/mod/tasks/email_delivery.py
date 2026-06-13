"""Send task emails and persist delivery details to application logs."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from mod.api.log.audit import log_email_delivery
from mod.tasks.email_send import send_task_email
from utils.db import SessionLocal

logger = logging.getLogger(__name__)

EMAIL_KIND_WELCOME_ONBOARDING = "welcome_onboarding"
EMAIL_KIND_PASSWORD_RESET = "password_reset"
EMAIL_KIND_CHANGE_PASSWORD_OTP = "change_password_otp"
EMAIL_KIND_INSPECTION_REVIEW = "inspection_review_notification"
EMAIL_KIND_SMTP_TEST = "smtp_test"
EMAIL_KIND_GENERIC = "generic"

CREATED_BY_TO_EMAIL_KIND: dict[str, str] = {
    "user_onboard": EMAIL_KIND_WELCOME_ONBOARDING,
    "auth_forgot_password": EMAIL_KIND_PASSWORD_RESET,
    "auth_change_password_otp": EMAIL_KIND_CHANGE_PASSWORD_OTP,
}


def resolve_email_kind(*, email_kind: str | None, created_by: str | None) -> str:
    if email_kind:
        return email_kind
    if created_by:
        mapped = CREATED_BY_TO_EMAIL_KIND.get(created_by.strip())
        if mapped:
            return mapped
    return EMAIL_KIND_GENERIC


def extract_message_fields(message: dict[str, Any]) -> tuple[str, str, str, str, str | None]:
    to_email = str(message.get("to_email", "") or "").strip()
    from_email = str(message.get("from_email", "") or "").strip()
    subject = str(message.get("subject", "") or "").strip()
    body_text = str(message.get("body_text", "") or "").strip()
    body_html_raw = message.get("body_html")
    body_html = str(body_html_raw).strip() if body_html_raw else None
    return to_email, from_email, subject, body_text, body_html


def send_and_log_task_email(
    db: Session | None,
    smtp_config: dict[str, Any],
    message: dict[str, Any],
    *,
    email_kind: str | None = None,
    actor_user_id: int | None = None,
    delivery_mode: str = "direct",
    task_uuid: str | None = None,
    created_by: str | None = None,
    commit_log: bool = False,
) -> None:
    to_email, from_email, subject, body_text, body_html = extract_message_fields(message)
    resolved_kind = resolve_email_kind(email_kind=email_kind, created_by=created_by)
    own_session = db is None
    session = SessionLocal() if own_session else db

    try:
        try:
            send_task_email(smtp_config, message)
            log_email_delivery(
                session,
                actor_user_id=actor_user_id,
                email_kind=resolved_kind,
                to_email=to_email,
                from_email=from_email,
                subject=subject,
                body_text=body_text,
                body_html=body_html,
                delivery_mode=delivery_mode,
                success=True,
                task_uuid=task_uuid,
                created_by=created_by,
            )
        except Exception as exc:
            log_email_delivery(
                session,
                actor_user_id=actor_user_id,
                email_kind=resolved_kind,
                to_email=to_email,
                from_email=from_email,
                subject=subject,
                body_text=body_text,
                body_html=body_html,
                delivery_mode=delivery_mode,
                success=False,
                error_message=str(exc) or exc.__class__.__name__,
                task_uuid=task_uuid,
                created_by=created_by,
            )
            if commit_log or own_session:
                session.commit()
            raise

        if commit_log or own_session:
            session.commit()
    finally:
        if own_session:
            session.close()
