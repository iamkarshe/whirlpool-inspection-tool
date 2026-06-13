from __future__ import annotations

from fastapi import HTTPException, status
from zxcvbn import zxcvbn

PASSWORD_STRENGTH_MIN_SCORE = 3


def validate_password_strength(
    password: str,
    *,
    user_inputs: list[str] | None = None,
) -> None:
    result = zxcvbn(password, user_inputs=[value for value in (user_inputs or []) if value])
    score = int(result.get("score", 0))
    if score >= PASSWORD_STRENGTH_MIN_SCORE:
        return

    feedback = result.get("feedback") or {}
    warning = str(feedback.get("warning") or "").strip()
    suggestions = [
        str(item).strip()
        for item in (feedback.get("suggestions") or [])
        if str(item).strip()
    ]
    detail = warning or (suggestions[0] if suggestions else "Password is too weak")
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=detail,
    )
