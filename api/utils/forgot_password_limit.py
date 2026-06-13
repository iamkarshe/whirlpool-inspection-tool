"""Per-IP forgot-password abuse protection (12-hour block after too many requests)."""

from __future__ import annotations

import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from mod.model import PasswordResetIpBlock, PasswordResetRequest
from utils.env import get_env_optional

FORGOT_PASSWORD_MAX_REQUESTS_DEFAULT = 5
FORGOT_PASSWORD_COUNT_WINDOW_SECONDS_DEFAULT = 60 * 60
FORGOT_PASSWORD_IP_BLOCK_SECONDS_DEFAULT = 12 * 60 * 60


def forgot_password_max_requests_per_ip() -> int:
    raw = get_env_optional(
        "FORGOT_PASSWORD_MAX_REQUESTS_PER_IP",
        str(FORGOT_PASSWORD_MAX_REQUESTS_DEFAULT),
    )
    try:
        value = int(raw or FORGOT_PASSWORD_MAX_REQUESTS_DEFAULT)
    except ValueError:
        return FORGOT_PASSWORD_MAX_REQUESTS_DEFAULT
    return max(1, value)


def forgot_password_count_window_seconds() -> int:
    raw = get_env_optional(
        "FORGOT_PASSWORD_COUNT_WINDOW_SECONDS",
        str(FORGOT_PASSWORD_COUNT_WINDOW_SECONDS_DEFAULT),
    )
    try:
        value = int(raw or FORGOT_PASSWORD_COUNT_WINDOW_SECONDS_DEFAULT)
    except ValueError:
        return FORGOT_PASSWORD_COUNT_WINDOW_SECONDS_DEFAULT
    return max(60, value)


def forgot_password_ip_block_seconds() -> int:
    raw = get_env_optional(
        "FORGOT_PASSWORD_IP_BLOCK_SECONDS",
        str(FORGOT_PASSWORD_IP_BLOCK_SECONDS_DEFAULT),
    )
    try:
        value = int(raw or FORGOT_PASSWORD_IP_BLOCK_SECONDS_DEFAULT)
    except ValueError:
        return FORGOT_PASSWORD_IP_BLOCK_SECONDS_DEFAULT
    return max(300, value)


def forgot_password_token_expiry_minutes() -> int:
    raw = get_env_optional("FORGOT_PASSWORD_TOKEN_EXPIRY_MINUTES", "60")
    try:
        value = int(raw or "60")
    except ValueError:
        return 60
    return max(15, min(value, 24 * 60))


def utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def raise_forgot_password_ip_blocked(retry_after_seconds: int) -> None:
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail="Too many password reset requests from this IP. Try again later.",
        headers={"Retry-After": str(max(1, retry_after_seconds))},
    )


def get_active_ip_block(
    db: Session,
    client_ip: str | None,
) -> PasswordResetIpBlock | None:
    if not client_ip:
        return None
    now = utc_now()
    return (
        db.query(PasswordResetIpBlock)
        .filter(
            PasswordResetIpBlock.ip_address == client_ip,
            PasswordResetIpBlock.blocked_until > now,
        )
        .first()
    )


def count_recent_password_reset_requests(
    db: Session,
    client_ip: str | None,
    *,
    window_seconds: int,
) -> int:
    if not client_ip:
        return 0
    cutoff = utc_now() - datetime.timedelta(seconds=window_seconds)
    return (
        db.query(PasswordResetRequest)
        .filter(
            PasswordResetRequest.ip_address == client_ip,
            PasswordResetRequest.created_at >= cutoff,
        )
        .count()
    )


def upsert_password_reset_ip_block(
    db: Session,
    *,
    client_ip: str,
    blocked_until: datetime.datetime,
    trigger_request_count: int,
) -> PasswordResetIpBlock:
    row = (
        db.query(PasswordResetIpBlock)
        .filter(PasswordResetIpBlock.ip_address == client_ip)
        .first()
    )
    if row is None:
        row = PasswordResetIpBlock(
            ip_address=client_ip,
            blocked_until=blocked_until,
            trigger_request_count=trigger_request_count,
        )
        db.add(row)
    else:
        row.blocked_until = blocked_until
        row.trigger_request_count = trigger_request_count
    db.flush()
    return row


def ensure_forgot_password_ip_allowed(db: Session, client_ip: str | None) -> None:
    block = get_active_ip_block(db, client_ip)
    if block is None:
        return
    retry_after = int((block.blocked_until - utc_now()).total_seconds()) + 1
    raise_forgot_password_ip_blocked(retry_after)


def enforce_forgot_password_ip_limit_after_request(
    db: Session,
    client_ip: str | None,
) -> PasswordResetIpBlock | None:
    if not client_ip:
        return None

    max_requests = forgot_password_max_requests_per_ip()
    window_seconds = forgot_password_count_window_seconds()
    block_seconds = forgot_password_ip_block_seconds()
    recent_count = count_recent_password_reset_requests(
        db,
        client_ip,
        window_seconds=window_seconds,
    )
    if recent_count <= max_requests:
        return None

    blocked_until = utc_now() + datetime.timedelta(seconds=block_seconds)
    return upsert_password_reset_ip_block(
        db,
        client_ip=client_ip,
        blocked_until=blocked_until,
        trigger_request_count=recent_count,
    )
