"""Shared OpenAPI response maps for auth routes (Orval / frontend error handling)."""

from __future__ import annotations

from fastapi import status

from mod.auth.response import (
    AuthRequestValidationErrorResponse,
    HttpDetailErrorResponse,
)

AUTH_RATE_LIMIT_HEADERS = {
    "Retry-After": {
        "description": "Seconds until this IP may call auth routes again.",
        "schema": {"type": "integer", "examples": [900]},
    },
    "X-Attempt-Remaining": {
        "description": "Auth attempts remaining for this IP in the current window.",
        "schema": {"type": "integer", "examples": [0]},
    },
}

AUTH_BODY_VALIDATION_RESPONSE = {
    "description": (
        "Request body failed Pydantic validation (e.g. invalid email format). "
        "Parse `error` for a summary and `details` for field-level messages."
    ),
    "model": AuthRequestValidationErrorResponse,
}

AUTH_HTTP_DETAIL_RESPONSE = {
    "description": "Business rule or auth failure. Display `detail` to the user.",
    "model": HttpDetailErrorResponse,
}

FORGOT_PASSWORD_OPENAPI_RESPONSES: dict[int | str, dict] = {
    status.HTTP_200_OK: {
        "description": (
            "Request accepted. Response message is always the same whether or not "
            "an account exists. In dev, use `debug.email_sent` and "
            "`debug.is_disallowed` to inspect the outcome."
        ),
    },
    status.HTTP_422_UNPROCESSABLE_CONTENT: AUTH_BODY_VALIDATION_RESPONSE,
    status.HTTP_429_TOO_MANY_REQUESTS: {
        "description": (
            "Rate limited. Either auth route attempts exceeded "
            "(AUTH_RATE_LIMIT_*) or forgot-password IP block "
            "(FORGOT_PASSWORD_*). Read `detail` and Retry-After header."
        ),
        "model": HttpDetailErrorResponse,
        "headers": AUTH_RATE_LIMIT_HEADERS,
    },
}

RESET_PASSWORD_OPENAPI_RESPONSES: dict[int | str, dict] = {
    status.HTTP_200_OK: {
        "description": "Password updated. All user sessions revoked; user must log in again.",
    },
    status.HTTP_400_BAD_REQUEST: {
        "description": (
            "Reset token is invalid, expired, already used, or belongs to a "
            "disallowed account (e.g. superadmin)."
        ),
        "model": HttpDetailErrorResponse,
    },
    status.HTTP_422_UNPROCESSABLE_CONTENT: {
        "description": (
            "Validation failed. Malformed JSON body returns "
            "{ success, error, details }. Password mismatch or weak password "
            "(zxcvbn score < 3) returns { detail }."
        ),
        "model": HttpDetailErrorResponse,
    },
    status.HTTP_429_TOO_MANY_REQUESTS: {
        "description": "Too many auth attempts from this IP (shared auth rate limiter).",
        "model": HttpDetailErrorResponse,
        "headers": AUTH_RATE_LIMIT_HEADERS,
    },
}
