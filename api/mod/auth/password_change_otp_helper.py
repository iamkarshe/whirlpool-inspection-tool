from __future__ import annotations

import datetime
import hashlib
import logging
import secrets
from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from mod.api.integration.helper import load_credentials_payload
from mod.auth.helper import RequestClientContext
from mod.model import PasswordChangeOtp, User
from mod.tasks.constants import CREDENTIAL_KEY_DEFAULT_SMTP
from mod.tasks.email_delivery import (
    EMAIL_KIND_CHANGE_PASSWORD_OTP,
    send_and_log_task_email,
)
from utils.env import is_celery_broker_configured, parse_env_bool_optional
from utils.change_password_otp import (
    OTP_PURPOSE_ONBOARDING,
    change_password_otp_expiry_minutes,
    change_password_otp_length,
    change_password_otp_max_requests,
    change_password_otp_request_window_seconds,
    is_change_password_otp_required_for_user,
    resolve_change_password_otp_purpose,
)
from utils.forgot_password_limit import utc_now

logger = logging.getLogger(__name__)

CHANGE_PASSWORD_OTP_ACCEPTED_MESSAGE = "Verification code sent to your email"
CHANGE_PASSWORD_OTP_NOT_REQUIRED_MESSAGE = (
    "Email verification is not required for password change"
)


@dataclass(frozen=True)
class ChangePasswordOtpRequestResult:
    message: str
    otp_required: bool
    email_sent: bool
    expires_in_minutes: int


def hash_change_password_otp(otp_code: str) -> str:
    normalized = otp_code.strip()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def generate_numeric_otp(length: int) -> str:
    upper = 10**length
    lower = 10 ** (length - 1)
    return str(secrets.randbelow(upper - lower) + lower)


def invalidate_pending_change_password_otps(
    db: Session,
    *,
    user_id: int,
    purpose: str,
) -> None:
    pending_rows = (
        db.query(PasswordChangeOtp)
        .filter(
            PasswordChangeOtp.user_id == user_id,
            PasswordChangeOtp.purpose == purpose,
            PasswordChangeOtp.is_consumed.is_(False),
            PasswordChangeOtp.is_active.is_(True),
        )
        .all()
    )
    for row in pending_rows:
        row.is_active = False


def count_recent_change_password_otp_requests(db: Session, user_id: int) -> int:
    window_start = utc_now() - datetime.timedelta(
        seconds=change_password_otp_request_window_seconds()
    )
    return (
        db.query(PasswordChangeOtp)
        .filter(
            PasswordChangeOtp.user_id == user_id,
            PasswordChangeOtp.created_at >= window_start,
            PasswordChangeOtp.is_active.is_(True),
        )
        .count()
    )


def enforce_change_password_otp_request_limit(db: Session, user_id: int) -> None:
    recent_count = count_recent_change_password_otp_requests(db, user_id)
    if recent_count >= change_password_otp_max_requests():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification code requests. Try again later.",
        )


def build_change_password_otp_email_message(
    *,
    to_email: str,
    user_name: str,
    otp_code: str,
    expires_in_minutes: int,
    smtp_from_email: str,
    smtp_from_name: str,
    purpose: str,
) -> dict[str, str]:
    if purpose == OTP_PURPOSE_ONBOARDING:
        context_line = "Use this code to finish setting your password after onboarding."
    else:
        context_line = "Use this code to confirm your account password change."

    subject = "Your Whirlpool PDI password change verification code"
    body_text = (
        f"Hello {user_name},\n\n"
        f"{context_line}\n\n"
        f"Verification code: {otp_code}\n"
        f"This code expires in {expires_in_minutes} minutes.\n\n"
        "If you did not request this, secure your account and contact support.\n"
    )
    body_html = (
        f"<p>Hello {user_name},</p>"
        f"<p>{context_line}</p>"
        f"<p><strong>Verification code:</strong> {otp_code}<br/>"
        f"This code expires in {expires_in_minutes} minutes.</p>"
        "<p>If you did not request this, secure your account and contact support.</p>"
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
        # nosemgrep: python.lang.security.audit.logging.logger-credential-leak.python-logger-credential-disclosure
        logger.exception(
            "Failed to load SMTP credentials for change-password OTP email"
        )
        return None, "", ""

    from_email = str(smtp_config.get("from_email", "") or "").strip()
    from_name = str(smtp_config.get("from_name", "") or "").strip() or "Whirlpool PDI"
    if not from_email:
        return None, "", ""
    return smtp_config, from_email, from_name


def change_password_otp_use_celery() -> bool:
    return parse_env_bool_optional("CHANGE_PASSWORD_OTP_USE_CELERY", default=False)


def queue_or_send_change_password_otp_email(
    db: Session | None,
    *,
    to_email: str,
    user_name: str,
    otp_code: str,
    expires_in_minutes: int,
    purpose: str,
) -> bool:
    smtp_config, from_email, from_name = resolve_smtp_message_config()
    if smtp_config is None or not from_email:
        # nosemgrep: python.lang.security.audit.logging.logger-credential-leak.python-logger-credential-disclosure
        logger.warning(
            "SMTP not configured; change-password OTP email skipped for %s", to_email
        )
        return False

    message = build_change_password_otp_email_message(
        to_email=to_email,
        user_name=user_name,
        otp_code=otp_code,
        expires_in_minutes=expires_in_minutes,
        smtp_from_email=from_email,
        smtp_from_name=from_name,
        purpose=purpose,
    )

    if (
        change_password_otp_use_celery()
        and is_celery_broker_configured()
        and db is not None
    ):
        from mod.tasks.queue import enqueue_background_task

        payload = {
            "credential_key": CREDENTIAL_KEY_DEFAULT_SMTP,
            "message": message,
        }
        try:
            task_uuid = enqueue_background_task(
                db,
                task_type="send_email",
                payload=payload,
                created_by="auth_change_password_otp",
            )
            # nosemgrep: python.lang.security.audit.logging.logger-credential-leak.python-logger-credential-disclosure
            logger.info(
                "Change-password OTP email queued for %s (task_uuid=%s)",
                to_email,
                task_uuid,
            )
            return True
        except Exception:
            # nosemgrep: python.lang.security.audit.logging.logger-credential-leak.python-logger-credential-disclosure
            logger.exception(
                "Failed to queue change-password OTP email for %s; trying direct SMTP",
                to_email,
            )

    try:
        send_and_log_task_email(
            None,
            smtp_config,
            message,
            email_kind=EMAIL_KIND_CHANGE_PASSWORD_OTP,
            actor_user_id=None,
            delivery_mode="direct",
            created_by="auth_change_password_otp",
            commit_log=True,
        )
        # nosemgrep: python.lang.security.audit.logging.logger-credential-leak.python-logger-credential-disclosure
        logger.info(
            "Change-password OTP email sent directly via SMTP to %s",
            to_email,
        )
        return True
    except Exception:
        # nosemgrep: python.lang.security.audit.logging.logger-credential-leak.python-logger-credential-disclosure
        logger.exception(
            "Direct change-password OTP email delivery failed for %s",
            to_email,
        )
        return False


def deliver_change_password_otp_email_after_commit(
    *,
    to_email: str,
    user_name: str,
    otp_code: str,
    expires_in_minutes: int,
    purpose: str,
) -> bool:
    return queue_or_send_change_password_otp_email(
        None,
        to_email=to_email,
        user_name=user_name,
        otp_code=otp_code,
        expires_in_minutes=expires_in_minutes,
        purpose=purpose,
    )


def request_change_password_otp(
    db: Session,
    *,
    user: User,
    ctx: RequestClientContext,
) -> ChangePasswordOtpRequestResult:
    expires_in_minutes = change_password_otp_expiry_minutes()
    if not is_change_password_otp_required_for_user(user):
        return ChangePasswordOtpRequestResult(
            message=CHANGE_PASSWORD_OTP_NOT_REQUIRED_MESSAGE,
            otp_required=False,
            email_sent=False,
            expires_in_minutes=expires_in_minutes,
        )

    purpose = resolve_change_password_otp_purpose(user)
    enforce_change_password_otp_request_limit(db, user.id)
    invalidate_pending_change_password_otps(db, user_id=user.id, purpose=purpose)

    otp_code = generate_numeric_otp(change_password_otp_length())
    expires_at = utc_now() + datetime.timedelta(minutes=expires_in_minutes)
    row = PasswordChangeOtp(
        user_id=user.id,
        purpose=purpose,
        otp_hash=hash_change_password_otp(otp_code),
        ip_address=ctx.client_ip,
        proxy_ip_address=ctx.proxy_ip,
        user_agent=ctx.user_agent,
        expires_at=expires_at,
        email_sent=False,
        is_consumed=False,
        is_active=True,
    )
    db.add(row)
    db.commit()

    email_sent = deliver_change_password_otp_email_after_commit(
        to_email=user.email,
        user_name=user.name,
        otp_code=otp_code,
        expires_in_minutes=expires_in_minutes,
        purpose=purpose,
    )
    row.email_sent = email_sent
    db.commit()

    if not email_sent:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to send verification code email. Try again later.",
        )

    return ChangePasswordOtpRequestResult(
        message=CHANGE_PASSWORD_OTP_ACCEPTED_MESSAGE,
        otp_required=True,
        email_sent=email_sent,
        expires_in_minutes=expires_in_minutes,
    )


def verify_change_password_otp(
    db: Session,
    *,
    user: User,
    otp_code: str,
) -> None:
    if not is_change_password_otp_required_for_user(user):
        return

    normalized = otp_code.strip()
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Email verification code is required",
        )

    purpose = resolve_change_password_otp_purpose(user)
    otp_hash = hash_change_password_otp(normalized)
    now = utc_now()
    row = (
        db.query(PasswordChangeOtp)
        .filter(
            PasswordChangeOtp.user_id == user.id,
            PasswordChangeOtp.purpose == purpose,
            PasswordChangeOtp.otp_hash == otp_hash,
            PasswordChangeOtp.is_consumed.is_(False),
            PasswordChangeOtp.is_active.is_(True),
            PasswordChangeOtp.expires_at >= now,
        )
        .order_by(PasswordChangeOtp.created_at.desc())
        .first()
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired verification code",
        )

    row.is_consumed = True
    row.consumed_at = now
    db.flush()
