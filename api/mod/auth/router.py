from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from mod.auth.actions import log_login_failure_action
from mod.auth.helper import (
    complete_login,
    ensure_user_is_active,
    get_request_client_context,
    log_user_not_found_and_raise,
    verify_sso_login_token,
)
from mod.auth.request import ForgotPasswordRequest, LoginRequest, LoginTokenRequest
from mod.auth.response import ForgotPasswordResponse, LoginResponse
from mod.model import User
from utils.db import get_db
from utils.password import verify_password

router = APIRouter(tags=["Auth"], prefix="/auth")


@router.post("/login", response_model=LoginResponse)
def login(
    request: Request,
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> LoginResponse:
    ctx = get_request_client_context(request)

    user: User | None = db.query(User).filter(User.email == str(payload.email)).first()

    if user is None:
        log_user_not_found_and_raise(db, ctx, reason="user_not_found")

    ensure_user_is_active(db, user, ctx)

    if not verify_password(payload.password, user.password):
        log_login_failure_action(
            db=db,
            user=user,
            client_ip=ctx.client_ip,
            proxy_ip=ctx.proxy_ip,
            user_agent=ctx.user_agent,
            reason="invalid_password",
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return complete_login(db, user, ctx, device_payload=payload.device)


@router.post(
    "/login-token",
    response_model=LoginResponse,
    name="login_token",
    summary="Complete login using SSO exchange token from Okta callback",
)
def login_token(
    request: Request,
    payload: LoginTokenRequest,
    db: Session = Depends(get_db),
) -> LoginResponse:
    ctx = get_request_client_context(request)
    email = verify_sso_login_token(payload.access_token)

    user: User | None = db.query(User).filter(User.email.ilike(email)).first()

    if user is None:
        log_user_not_found_and_raise(
            db,
            ctx,
            reason="sso_user_not_found",
            detail="No account found for this SSO user",
        )

    ensure_user_is_active(db, user, ctx, failure_reason="sso_inactive_user")

    return complete_login(db, user, ctx, device_payload=payload.device)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    payload: ForgotPasswordRequest, db: Session = Depends(get_db)
) -> ForgotPasswordResponse:
    user: User | None = db.query(User).filter(User.email == str(payload.email)).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid email",
        )

    return ForgotPasswordResponse(message="Password reset request accepted")
