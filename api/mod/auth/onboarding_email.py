from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from mod.api.integration.helper import load_credentials_payload
from mod.tasks.constants import CREDENTIAL_KEY_DEFAULT_SMTP
from mod.tasks.email_delivery import (
    EMAIL_KIND_WELCOME_ONBOARDING,
    send_and_log_task_email,
)
from mod.tasks.queue import enqueue_background_task
from utils.db import SessionLocal
from utils.env import get_frontend_base_url, is_celery_broker_configured

logger = logging.getLogger(__name__)

LOGIN_URL_PATH = "/login"


def build_login_absolute_url() -> str:
    base = get_frontend_base_url()
    if base:
        return f"{base.rstrip('/')}{LOGIN_URL_PATH}"
    return LOGIN_URL_PATH


def build_welcome_onboarding_email_message(
    *,
    to_email: str,
    user_name: str,
    temporary_password: str,
    login_url: str,
    smtp_from_email: str,
    smtp_from_name: str,
) -> dict[str, str]:
    subject = "Welcome to Whirlpool PDI — your account is ready"
    body_text = (
        f"Hello {user_name},\n\n"
        "Your Whirlpool PDI account has been created. Sign in with the credentials below "
        "and you will be asked to set a new password before using the application.\n\n"
        f"Login URL: {login_url}\n"
        f"Email: {to_email}\n"
        f"Temporary password: {temporary_password}\n\n"
        "VPN setup instructions are sent separately when your administrator provisions VPN access.\n"
    )
    body_html = (
        f"<p>Hello {user_name},</p>"
        "<p>Your Whirlpool PDI account has been created. Sign in with the credentials below "
        "and you will be asked to set a new password before using the application.</p>"
        f"<p><strong>Login URL:</strong> <a href=\"{login_url}\">{login_url}</a><br/>"
        f"<strong>Email:</strong> {to_email}<br/>"
        f"<strong>Temporary password:</strong> {temporary_password}</p>"
        "<p>VPN setup instructions are sent separately when your administrator provisions VPN access.</p>"
    )
    return {
        "from_email": smtp_from_email,
        "from_name": smtp_from_name,
        "to_email": to_email,
        "subject": subject,
        "body_text": body_text,
        "body_html": body_html,
    }


def resolve_smtp_message_config() -> tuple[dict[str, Any] | None, str, str]:
    try:
        smtp_config = dict(load_credentials_payload().get("smtp") or {})
    except Exception:
        logger.exception("Failed to load SMTP credentials for welcome onboarding email")
        return None, "", ""

    from_email = str(smtp_config.get("from_email", "") or "").strip()
    from_name = str(smtp_config.get("from_name", "") or "").strip() or "Whirlpool PDI"
    if not from_email:
        logger.warning("SMTP from_email missing; welcome onboarding email skipped")
        return None, "", ""
    return smtp_config, from_email, from_name


def queue_or_send_welcome_onboarding_email(
    db: Session,
    *,
    to_email: str,
    user_name: str,
    temporary_password: str,
) -> bool:
    smtp_config, from_email, from_name = resolve_smtp_message_config()
    if smtp_config is None or not from_email:
        logger.warning(
            "SMTP not configured; welcome onboarding email skipped for %s", to_email
        )
        return False

    message = build_welcome_onboarding_email_message(
        to_email=to_email,
        user_name=user_name,
        temporary_password=temporary_password,
        login_url=build_login_absolute_url(),
        smtp_from_email=from_email,
        smtp_from_name=from_name,
    )
    payload = {
        "credential_key": CREDENTIAL_KEY_DEFAULT_SMTP,
        "message": message,
    }

    if is_celery_broker_configured():
        try:
            task_uuid = enqueue_background_task(
                db,
                task_type="send_email",
                payload=payload,
                created_by="user_onboard",
            )
            logger.info(
                "Welcome onboarding email queued for %s (task_uuid=%s)",
                to_email,
                task_uuid,
            )
            return True
        except Exception:
            logger.exception(
                "Failed to queue welcome onboarding email for %s; trying direct SMTP",
                to_email,
            )

    try:
        send_and_log_task_email(
            None,
            smtp_config,
            message,
            email_kind=EMAIL_KIND_WELCOME_ONBOARDING,
            delivery_mode="direct",
            created_by="user_onboard",
            commit_log=True,
        )
        logger.info("Welcome onboarding email sent directly via SMTP to %s", to_email)
        return True
    except Exception:
        logger.exception("Direct welcome onboarding email delivery failed for %s", to_email)
        return False


def deliver_welcome_onboarding_email_after_commit(
    *,
    to_email: str,
    user_name: str,
    temporary_password: str,
) -> bool:
    db = SessionLocal()
    try:
        return queue_or_send_welcome_onboarding_email(
            db,
            to_email=to_email,
            user_name=user_name,
            temporary_password=temporary_password,
        )
    finally:
        db.close()
