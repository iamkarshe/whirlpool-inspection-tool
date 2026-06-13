from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from mod.api.log.audit import log_auth_password_changed
from mod.auth.helper import RequestClientContext
from mod.model import User
from utils.password import verify_password
from utils.password_policy import apply_user_password_change
from mod.auth.password_change_otp_helper import verify_change_password_otp
from utils.change_password_otp import is_change_password_otp_required_for_user


def process_change_password(
    db: Session,
    *,
    user: User,
    current_password: str,
    new_password: str,
    confirm_password: str,
    otp_code: str | None = None,
    ctx: RequestClientContext,
    change_reason: str = "user_initiated",
) -> str:
    if new_password != confirm_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password and confirm password do not match",
        )

    if not verify_password(current_password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    if verify_password(new_password, user.password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="New password must be different from your current password",
        )

    if is_change_password_otp_required_for_user(user):
        if not otp_code or not otp_code.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Email verification code is required",
            )
        verify_change_password_otp(db, user=user, otp_code=otp_code)

    apply_user_password_change(
        db,
        user,
        new_password,
        user_inputs=[user.email, user.name, user.mobile_number],
    )

    log_auth_password_changed(
        db,
        user_id=user.id,
        client_ip=ctx.client_ip,
        proxy_ip=ctx.proxy_ip,
        user_agent=ctx.user_agent,
        change_reason=change_reason,
    )

    db.commit()
    return "Password updated successfully"
