from __future__ import annotations

import uuid
from dataclasses import dataclass

from fastapi import HTTPException
from sqlalchemy.orm import Session

from mod.api.user.helper import user_with_role_and_scope
from mod.model import User
from utils.password import hash_password
from utils.password_policy import generate_temporary_password


@dataclass(frozen=True)
class UserOnboardPendingResult:
    user: User
    temporary_password: str
    target_role: str


def onboard_existing_user(
    db: Session,
    *,
    user_uuid: uuid.UUID,
) -> UserOnboardPendingResult:
    user = user_with_role_and_scope(db, user_uuid)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    role_name = (user.role.role or "").lower()
    if role_name == "superadmin":
        raise HTTPException(
            status_code=403,
            detail="Cannot onboard superadmin accounts",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Cannot onboard inactive users",
        )

    temporary_password = generate_temporary_password()
    user.password = hash_password(temporary_password)
    user.must_change_password = True
    user.password_changed_at = None
    db.flush()

    loaded = user_with_role_and_scope(db, user.uuid)
    if loaded is None:
        raise HTTPException(status_code=500, detail="User reload failed")
    return UserOnboardPendingResult(
        user=loaded,
        temporary_password=temporary_password,
        target_role=loaded.role.role,
    )
