from __future__ import annotations

import datetime
import hashlib
import logging
import secrets
from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from mod.api.integration.helper import load_credentials_payload
from mod.api.log.audit import (
    log_auth_forgot_password_blocked,
    log_auth_forgot_password_request,
    log_auth_password_reset_completed,
)
from mod.auth.helper import LOGIN_USER_LOAD_OPTIONS, RequestClientContext
from mod.auth.session import revoke_all_sessions_for_user
from mod.model import PasswordResetRequest, User
from mod.tasks.constants import CREDENTIAL_KEY_DEFAULT_SMTP
from mod.tasks.email_delivery import (
    EMAIL_KIND_PASSWORD_RESET,
    send_and_log_task_email,
)
from mod.tasks.queue import try_enqueue_background_task
from utils.common import normalize_login_email
from utils.env import get_frontend_base_url
from utils.forgot_password_limit import (
    enforce_forgot_password_ip_limit_after_request,
    forgot_password_token_expiry_minutes,
    get_active_ip_block,
    raise_forgot_password_ip_blocked,
    utc_now,
)
from utils.password_policy import apply_user_password_change
from utils.roles import ROLE_SUPERADMIN

logger = logging.getLogger(__name__)

PASSWORD_RESET_URL_PATH = "/reset-password"
FORGOT_PASSWORD_ACCEPTED_MESSAGE = "Password reset request accepted"
PASSWORD_RESET_SUCCESS_MESSAGE = "Password updated successfully"


@dataclass(frozen=True)
class ForgotPasswordResult:
    message: str
    email_sent: bool
    is_disallowed: bool


def hash_password_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def user_can_request_password_reset(user: User) -> bool:
    if not user.is_active:
        return False
    role = user.role
    if role is None or not role.is_active:
        return False
    role_name = (role.role or "").strip().lower()
    if role_name == ROLE_SUPERADMIN:
        return False
    return True


def get_user_for_password_reset(db: Session, email: str) -> User | None:
    normalized_email = normalize_login_email(email)
    return (
        db.query(User)
        .options(*LOGIN_USER_LOAD_OPTIONS)
        .filter(User.email == normalized_email)
        .first()
    )


def invalidate_pending_password_reset_requests(db: Session, user_id: int) -> None:
    pending_rows = (
        db.query(PasswordResetRequest)
        .filter(
            PasswordResetRequest.user_id == user_id,
            PasswordResetRequest.is_completed.is_(False),
            PasswordResetRequest.is_active.is_(True),
            PasswordResetRequest.token_hash.isnot(None),
        )
        .all()
    )
    for row in pending_rows:
        row.is_active = False


def build_password_reset_absolute_url(token: str) -> str:
    path = f"{PASSWORD_RESET_URL_PATH}?token={token}"
    base = get_frontend_base_url()
    if base:
        return f"{base.rstrip('/')}{path}"
    return path


def build_password_reset_email_message(
    *,
    to_email: str,
    reset_url: str,
    user_name: str,
    smtp_from_email: str,
    smtp_from_name: str,
) -> dict[str, str]:
    subject = "Reset your Whirlpool PDI password"
    body_text = (
        f"Hello {user_name},\n\n"
        "We received a request to reset your password. Open the link below to choose "
        f"a new password:\n\n{reset_url}\n\n"
        "If you did not request this, you can ignore this email.\n"
    )
    body_html = (
        f"<p>Hello {user_name},</p>"
        "<p>We received a request to reset your password. "
        f'<a href="{reset_url}">Click here to choose a new password</a>.</p>'
        "<p>If you did not request this, you can ignore this email.</p>"
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
        logger.exception("Failed to load SMTP credentials for password reset email")
        return None, "", ""

    from_email = str(smtp_config.get("from_email", "") or "").strip()
    from_name = str(smtp_config.get("from_name", "") or "").strip() or "Whirlpool PDI"
    if not from_email:
        return None, "", ""
    return smtp_config, from_email, from_name


def queue_or_send_password_reset_email(
    db: Session,
    *,
    to_email: str,
    reset_url: str,
    user_name: str,
) -> bool:
    smtp_config, from_email, from_name = resolve_smtp_message_config()
    if smtp_config is None or not from_email:
        # nosemgrep: python.lang.security.audit.logging.logger-credential-leak.python-logger-credential-disclosure
        logger.warning(
            "SMTP not configured; password reset email skipped for %s", to_email
        )
        return False

    message = build_password_reset_email_message(
        to_email=to_email,
        reset_url=reset_url,
        user_name=user_name,
        smtp_from_email=from_email,
        smtp_from_name=from_name,
    )
    payload = {
        "credential_key": CREDENTIAL_KEY_DEFAULT_SMTP,
        "message": message,
    }
    task_uuid = try_enqueue_background_task(
        db,
        task_type="send_email",
        payload=payload,
        created_by="auth_forgot_password",
    )
    if task_uuid is not None:
        return True

    try:
        send_and_log_task_email(
            db,
            smtp_config,
            message,
            email_kind=EMAIL_KIND_PASSWORD_RESET,
            delivery_mode="direct",
            created_by="auth_forgot_password",
        )
        return True
    except Exception:
        # nosemgrep: python.lang.security.audit.logging.logger-credential-leak.python-logger-credential-disclosure
        logger.exception("Direct password reset email delivery failed for %s", to_email)
        return False


def create_password_reset_request(
    db: Session,
    *,
    user: User | None,
    attempted_email: str,
    ctx: RequestClientContext,
    plain_token: str | None = None,
    is_disallowed: bool = False,
) -> PasswordResetRequest:
    if user is not None:
        invalidate_pending_password_reset_requests(db, user.id)

    expires_at = utc_now() + datetime.timedelta(
        minutes=forgot_password_token_expiry_minutes()
    )
    token_hash = (
        hash_password_reset_token(plain_token) if plain_token is not None else None
    )
    reset_request = PasswordResetRequest(
        user_id=user.id if user is not None else None,
        attempted_email=normalize_login_email(attempted_email),
        token_hash=token_hash,
        ip_address=ctx.client_ip,
        proxy_ip_address=ctx.proxy_ip,
        user_agent=ctx.user_agent,
        expires_at=expires_at,
        is_disallowed=is_disallowed,
    )
    db.add(reset_request)
    db.flush()
    return reset_request


def process_forgot_password(
    db: Session,
    *,
    email: str,
    ctx: RequestClientContext,
) -> ForgotPasswordResult:
    normalized_email = normalize_login_email(email)
    active_block = get_active_ip_block(db, ctx.client_ip)
    if active_block is not None:
        create_password_reset_request(
            db,
            user=None,
            attempted_email=normalized_email,
            ctx=ctx,
            is_disallowed=True,
        )
        log_auth_forgot_password_blocked(
            db,
            client_ip=ctx.client_ip,
            proxy_ip=ctx.proxy_ip,
            user_agent=ctx.user_agent,
            attempted_email=normalized_email,
            blocked_until=active_block.blocked_until.isoformat(),
            trigger_request_count=active_block.trigger_request_count,
            rejection_reason="ip_already_blocked",
        )
        db.commit()
        retry_after = int((active_block.blocked_until - utc_now()).total_seconds()) + 1
        raise_forgot_password_ip_blocked(retry_after)

    user = get_user_for_password_reset(db, email)
    email_sent = False
    reset_request_uuid: str | None = None
    skipped_reason: str | None = None
    plain_token: str | None = None

    if user is not None and user_can_request_password_reset(user):
        plain_token = secrets.token_urlsafe(32)
        reset_request = create_password_reset_request(
            db,
            user=user,
            attempted_email=normalized_email,
            ctx=ctx,
            plain_token=plain_token,
            is_disallowed=False,
        )
        reset_request_uuid = str(reset_request.uuid)
        reset_url = build_password_reset_absolute_url(plain_token)
        email_sent = queue_or_send_password_reset_email(
            db,
            to_email=user.email,
            reset_url=reset_url,
            user_name=user.name,
        )
        reset_request.email_sent = email_sent
    else:
        if user is None:
            skipped_reason = "user_not_found"
        else:
            role_name = (
                (user.role.role or "").strip().lower() if user.role is not None else ""
            )
            if role_name == ROLE_SUPERADMIN:
                skipped_reason = "superadmin_not_allowed"
            elif not user.is_active:
                skipped_reason = "inactive_user"
            else:
                skipped_reason = "invalid_role"

        reset_request = create_password_reset_request(
            db,
            user=user,
            attempted_email=normalized_email,
            ctx=ctx,
            is_disallowed=True,
        )
        reset_request_uuid = str(reset_request.uuid)

    log_auth_forgot_password_request(
        db,
        user_id=getattr(user, "id", None),
        client_ip=ctx.client_ip,
        proxy_ip=ctx.proxy_ip,
        user_agent=ctx.user_agent,
        attempted_email=normalized_email,
        password_reset_request_uuid=reset_request_uuid,
        email_sent=email_sent,
        skipped_reason=skipped_reason,
    )

    ip_block = enforce_forgot_password_ip_limit_after_request(db, ctx.client_ip)
    if ip_block is not None:
        log_auth_forgot_password_blocked(
            db,
            client_ip=ctx.client_ip,
            proxy_ip=ctx.proxy_ip,
            user_agent=ctx.user_agent,
            attempted_email=normalized_email,
            blocked_until=ip_block.blocked_until.isoformat(),
            trigger_request_count=ip_block.trigger_request_count,
            rejection_reason="rate_limit_exceeded",
        )

    db.commit()
    return ForgotPasswordResult(
        message=FORGOT_PASSWORD_ACCEPTED_MESSAGE,
        email_sent=email_sent,
        is_disallowed=reset_request.is_disallowed,
    )


def get_active_password_reset_request_by_token(
    db: Session,
    token: str,
) -> PasswordResetRequest | None:
    token_hash = hash_password_reset_token(token.strip())
    now = utc_now()
    return (
        db.query(PasswordResetRequest)
        .options(joinedload(PasswordResetRequest.user).joinedload(User.role))
        .filter(
            PasswordResetRequest.token_hash == token_hash,
            PasswordResetRequest.token_hash.isnot(None),
            PasswordResetRequest.is_active.is_(True),
            PasswordResetRequest.is_completed.is_(False),
            PasswordResetRequest.expires_at > now,
        )
        .first()
    )


def process_reset_password(
    db: Session,
    *,
    token: str,
    password: str,
    confirm_password: str,
    ctx: RequestClientContext,
) -> str:
    if password != confirm_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Password and confirm password do not match",
        )

    reset_request = get_active_password_reset_request_by_token(db, token)
    if reset_request is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset link",
        )

    user = reset_request.user
    if user is None or not user_can_request_password_reset(user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset link",
        )

    apply_user_password_change(
        db,
        user,
        password,
        user_inputs=[user.email, user.name, user.mobile_number],
    )
    reset_request.is_completed = True
    reset_request.completed_at = utc_now()
    revoke_all_sessions_for_user(db, user.id)

    log_auth_password_reset_completed(
        db,
        user_id=user.id,
        client_ip=ctx.client_ip,
        proxy_ip=ctx.proxy_ip,
        user_agent=ctx.user_agent,
        password_reset_request_uuid=str(reset_request.uuid),
    )

    db.commit()
    return PASSWORD_RESET_SUCCESS_MESSAGE
