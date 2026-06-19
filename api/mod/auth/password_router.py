from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload

from mod.api.middleware import auth_dependency
from mod.auth.helper import get_request_client_context
from mod.auth.password_change_helper import process_change_password
from mod.auth.password_change_otp_helper import request_change_password_otp
from mod.auth.request import ChangePasswordRequest
from mod.auth.response import (
    ChangePasswordOtpDebugResponse,
    ChangePasswordOtpResponse,
    ChangePasswordResponse,
    HttpDetailErrorResponse,
)
from mod.model import User
from utils.db import get_db
from utils.env import is_development_environment

router = APIRouter(
    tags=["Auth"],
    prefix="/auth",
    dependencies=[Depends(auth_dependency)],
)


@router.post(
    "/change-password/request-otp",
    name="request_change_password_otp",
    summary="Request change-password email OTP",
    description=(
        "Sends a one-time verification code to the authenticated user's email. "
        "Required before POST /auth/change-password when "
        "CHANGE_PASSWORD_ONBOARDING_OTP_REQUIRED (first login / forced rotation) or "
        "CHANGE_PASSWORD_OTP_REQUIRED (voluntary account password change) is enabled."
    ),
    response_model=ChangePasswordOtpResponse,
    responses={
        429: {
            "description": "Too many OTP requests.",
            "model": HttpDetailErrorResponse,
        },
        503: {
            "description": "SMTP unavailable.",
            "model": HttpDetailErrorResponse,
        },
    },
)
def request_change_password_otp_route(
    request: Request,
    db: Session = Depends(get_db),
) -> ChangePasswordOtpResponse:
    user = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.id == int(request.state.user_id))
        .first()
    )
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    ctx = get_request_client_context(request)
    result = request_change_password_otp(db, user=user, ctx=ctx)
    debug = None
    if is_development_environment():
        debug = ChangePasswordOtpDebugResponse(
            otp_required=result.otp_required,
            email_sent=result.email_sent,
        )
    return ChangePasswordOtpResponse(
        message=result.message,
        otp_required=result.otp_required,
        expires_in_minutes=result.expires_in_minutes,
        debug=debug,
    )


@router.post(
    "/change-password",
    name="change_password",
    summary="Change password",
    description=(
        "Authenticated password change for onboarding temp passwords and periodic "
        "rotation. Validates zxcvbn strength and rejects reuse of the current or last "
        "3 passwords. After onboarding (must_change_password=false), email OTP is "
        "required by default — call POST /auth/change-password/request-otp first. "
        "First login after onboard (must_change_password=true) skips OTP unless "
        "CHANGE_PASSWORD_ONBOARDING_OTP_REQUIRED=true. Clears must_change_password "
        "and password_expired flags."
    ),
    response_model=ChangePasswordResponse,
    responses={
        401: {
            "description": "Current password or OTP is incorrect.",
            "model": HttpDetailErrorResponse,
        },
        422: {
            "description": "Validation failed, weak password, or password reuse.",
            "model": HttpDetailErrorResponse,
        },
    },
)
def change_password(
    request: Request,
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
) -> ChangePasswordResponse:
    user = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.id == int(request.state.user_id))
        .first()
    )
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    ctx = get_request_client_context(request)
    message = process_change_password(
        db,
        user=user,
        current_password=payload.current_password,
        new_password=payload.new_password,
        confirm_password=payload.confirm_password,
        otp_code=payload.otp_code,
        ctx=ctx,
        change_reason="user_initiated",
    )
    return ChangePasswordResponse(message=message)
