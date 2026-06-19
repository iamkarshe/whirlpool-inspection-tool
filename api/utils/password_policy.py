from __future__ import annotations

import datetime
import secrets
import string

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from mod.model import User, UserPasswordHistory
from utils.env import get_env_optional
from utils.password import hash_password, verify_password
from utils.password_strength import validate_password_strength
from utils.roles import ROLE_SUPERADMIN

PASSWORD_MAX_AGE_DAYS_DEFAULT = 90
PASSWORD_HISTORY_LIMIT_DEFAULT = 3
TEMPORARY_PASSWORD_LENGTH_DEFAULT = 14


def get_password_max_age_days() -> int:
    raw = get_env_optional(
        "PASSWORD_MAX_AGE_DAYS",
        str(PASSWORD_MAX_AGE_DAYS_DEFAULT),
    )
    try:
        value = int(raw or PASSWORD_MAX_AGE_DAYS_DEFAULT)
    except ValueError:
        return PASSWORD_MAX_AGE_DAYS_DEFAULT
    return max(1, value)


def get_password_history_limit() -> int:
    raw = get_env_optional(
        "PASSWORD_HISTORY_LIMIT",
        str(PASSWORD_HISTORY_LIMIT_DEFAULT),
    )
    try:
        value = int(raw or PASSWORD_HISTORY_LIMIT_DEFAULT)
    except ValueError:
        return PASSWORD_HISTORY_LIMIT_DEFAULT
    return max(1, value)


def utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def user_role_name(user: User) -> str:
    role = user.role
    if role is None:
        return ""
    return (role.role or "").strip().lower()


def user_is_superadmin(user: User) -> bool:
    return user_role_name(user) == ROLE_SUPERADMIN


def password_policy_applies_to_user(user: User) -> bool:
    return not user_is_superadmin(user)


def resolve_password_change_flags(user: User) -> tuple[bool, bool]:
    if not password_policy_applies_to_user(user):
        return False, False

    if user.must_change_password:
        return True, False

    if user.password_changed_at is None:
        return True, False

    max_age_days = get_password_max_age_days()
    expires_at = user.password_changed_at + datetime.timedelta(days=max_age_days)
    if utc_now() >= expires_at:
        return False, True

    return False, False


def requires_password_change(user: User) -> bool:
    must_change, password_expired = resolve_password_change_flags(user)
    return must_change or password_expired


def list_recent_password_hashes(db: Session, user_id: int) -> list[str]:
    rows = (
        db.query(UserPasswordHistory)
        .filter(UserPasswordHistory.user_id == user_id)
        .order_by(UserPasswordHistory.created_at.desc())
        .limit(get_password_history_limit())
        .all()
    )
    return [row.password_hash for row in rows]


def password_matches_any_hash(plain_password: str, hashes: list[str]) -> bool:
    return any(verify_password(plain_password, stored_hash) for stored_hash in hashes)


def ensure_password_not_reused(db: Session, user: User, new_password: str) -> None:
    if not password_policy_applies_to_user(user):
        return

    hashes_to_check = [user.password, *list_recent_password_hashes(db, user.id)]
    if password_matches_any_hash(new_password, hashes_to_check):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Password cannot match your current or last 3 passwords",
        )


def archive_current_password(db: Session, user: User) -> None:
    if not user.password:
        return
    db.add(
        UserPasswordHistory(
            user_id=user.id,
            password_hash=user.password,
        )
    )
    db.flush()
    trim_password_history(db, user.id)


def trim_password_history(db: Session, user_id: int) -> None:
    limit = get_password_history_limit()
    rows = (
        db.query(UserPasswordHistory)
        .filter(UserPasswordHistory.user_id == user_id)
        .order_by(UserPasswordHistory.created_at.desc())
        .all()
    )
    for row in rows[limit:]:
        db.delete(row)
    db.flush()


def apply_user_password_change(
    db: Session,
    user: User,
    new_password: str,
    *,
    user_inputs: list[str] | None = None,
) -> None:
    inputs = user_inputs or [user.email, user.name, user.mobile_number]
    validate_password_strength(new_password, user_inputs=inputs)
    ensure_password_not_reused(db, user, new_password)
    archive_current_password(db, user)
    user.password = hash_password(new_password)
    user.password_changed_at = utc_now()
    user.must_change_password = False


def generate_temporary_password(length: int = TEMPORARY_PASSWORD_LENGTH_DEFAULT) -> str:
    alphabet = string.ascii_letters + string.digits
    while True:
        candidate = "".join(secrets.choice(alphabet) for _ in range(length))
        if (
            any(char.islower() for char in candidate)
            and any(char.isupper() for char in candidate)
            and any(char.isdigit() for char in candidate)
        ):
            return candidate


PASSWORD_POLICY_EXEMPT_PATHS = frozenset(
    {
        "/auth/change-password",
        "/auth/change-password/request-otp",
    }
)


def auth_path_exempt_from_password_policy(path: str) -> bool:
    normalized = path.rstrip("/") or "/"
    return normalized in PASSWORD_POLICY_EXEMPT_PATHS
