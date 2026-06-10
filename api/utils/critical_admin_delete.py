import secrets

from fastapi import Header, HTTPException, status

from utils.env import get_critical_admin_delete_token

CRITICAL_ADMIN_DELETE_HEADER = "x-critical-admin-delete-token"


def require_critical_admin_delete_token(
    x_critical_admin_delete_token: str | None = Header(
        None,
        alias=CRITICAL_ADMIN_DELETE_HEADER,
        description="Shared secret from CRITICAL_ADMIN_DELETE_TOKEN env var.",
    ),
) -> None:
    verify_critical_admin_delete_token(x_critical_admin_delete_token)


def verify_critical_admin_delete_token(header_value: str | None) -> None:
    expected = get_critical_admin_delete_token()
    if expected is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRITICAL_ADMIN_DELETE_TOKEN is not configured",
        )
    if not header_value or not secrets.compare_digest(header_value, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing x-critical-admin-delete-token",
        )
