"""ENV configuration and user-context helpers for change-password email OTP."""

from __future__ import annotations

from mod.model import User
from utils.env import get_env_optional
from utils.password_policy import resolve_password_change_flags

OTP_PURPOSE_ONBOARDING = "onboarding"
OTP_PURPOSE_ACCOUNT = "account"

CHANGE_PASSWORD_ONBOARDING_OTP_REQUIRED_DEFAULT = False
CHANGE_PASSWORD_OTP_REQUIRED_DEFAULT = True
CHANGE_PASSWORD_OTP_EXPIRY_MINUTES_DEFAULT = 10
CHANGE_PASSWORD_OTP_LENGTH_DEFAULT = 6
CHANGE_PASSWORD_OTP_MAX_REQUESTS_DEFAULT = 5
CHANGE_PASSWORD_OTP_REQUEST_WINDOW_SECONDS_DEFAULT = 900


def _parse_env_bool(key: str, default: bool) -> bool:
    raw = (
        get_env_optional(key, "true" if default else "false")
        or ("true" if default else "false")
    ).strip().lower()
    return raw in {"1", "true", "yes", "on"}


def is_change_password_onboarding_otp_required() -> bool:
    return _parse_env_bool(
        "CHANGE_PASSWORD_ONBOARDING_OTP_REQUIRED",
        CHANGE_PASSWORD_ONBOARDING_OTP_REQUIRED_DEFAULT,
    )


def is_change_password_account_otp_required() -> bool:
    return _parse_env_bool(
        "CHANGE_PASSWORD_OTP_REQUIRED",
        CHANGE_PASSWORD_OTP_REQUIRED_DEFAULT,
    )


def change_password_otp_expiry_minutes() -> int:
    raw = get_env_optional(
        "CHANGE_PASSWORD_OTP_EXPIRY_MINUTES",
        str(CHANGE_PASSWORD_OTP_EXPIRY_MINUTES_DEFAULT),
    )
    try:
        value = int(raw or CHANGE_PASSWORD_OTP_EXPIRY_MINUTES_DEFAULT)
    except ValueError:
        return CHANGE_PASSWORD_OTP_EXPIRY_MINUTES_DEFAULT
    return max(1, min(value, 60))


def change_password_otp_length() -> int:
    raw = get_env_optional(
        "CHANGE_PASSWORD_OTP_LENGTH",
        str(CHANGE_PASSWORD_OTP_LENGTH_DEFAULT),
    )
    try:
        value = int(raw or CHANGE_PASSWORD_OTP_LENGTH_DEFAULT)
    except ValueError:
        return CHANGE_PASSWORD_OTP_LENGTH_DEFAULT
    return max(4, min(value, 8))


def change_password_otp_max_requests() -> int:
    raw = get_env_optional(
        "CHANGE_PASSWORD_OTP_MAX_REQUESTS",
        str(CHANGE_PASSWORD_OTP_MAX_REQUESTS_DEFAULT),
    )
    try:
        value = int(raw or CHANGE_PASSWORD_OTP_MAX_REQUESTS_DEFAULT)
    except ValueError:
        return CHANGE_PASSWORD_OTP_MAX_REQUESTS_DEFAULT
    return max(1, value)


def change_password_otp_request_window_seconds() -> int:
    raw = get_env_optional(
        "CHANGE_PASSWORD_OTP_REQUEST_WINDOW_SECONDS",
        str(CHANGE_PASSWORD_OTP_REQUEST_WINDOW_SECONDS_DEFAULT),
    )
    try:
        value = int(raw or CHANGE_PASSWORD_OTP_REQUEST_WINDOW_SECONDS_DEFAULT)
    except ValueError:
        return CHANGE_PASSWORD_OTP_REQUEST_WINDOW_SECONDS_DEFAULT
    return max(60, value)


def resolve_change_password_otp_purpose(user: User) -> str:
    must_change_password, _password_expired = resolve_password_change_flags(user)
    if must_change_password:
        return OTP_PURPOSE_ONBOARDING
    return OTP_PURPOSE_ACCOUNT


def is_change_password_otp_required_for_user(user: User) -> bool:
    must_change_password, _password_expired = resolve_password_change_flags(user)
    if must_change_password:
        return is_change_password_onboarding_otp_required()
    return is_change_password_account_otp_required()
