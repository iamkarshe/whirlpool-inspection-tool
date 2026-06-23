from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from utils.auth_rate_limit import (
    require_auth_rate_limit,
    reset_auth_rate_limit_after_successful_login,
)
from sqlalchemy.orm import Session

from mod.auth.actions import build_login_device_metadata, log_login_failure_action
from utils.common import normalize_login_email
from mod.auth.helper import (
    ensure_user_is_active,
    get_request_client_context,
    get_user_for_login,
    log_user_not_found_and_raise,
    verify_sso_login_token,
)
from mod.auth.two_factor_helper import begin_login_after_credentials_verified
from mod.auth.openapi_responses import (
    FORGOT_PASSWORD_OPENAPI_RESPONSES,
    RESET_PASSWORD_OPENAPI_RESPONSES,
)
from mod.auth.password_reset_helper import process_forgot_password, process_reset_password
from mod.auth.request import (
    ForgotPasswordRequest,
    LoginRequest,
    LoginTokenRequest,
    ResetPasswordRequest,
)
from mod.auth.response import (
    ForgotPasswordDebugResponse,
    ForgotPasswordResponse,
    LoginResponse,
    ResetPasswordResponse,
)
from mod.model import User
from utils.db import get_db
from utils.env import is_development_environment
from utils.password import verify_password

router = APIRouter(
    tags=["Auth"],
    prefix="/auth",
    dependencies=[Depends(require_auth_rate_limit)],
    responses={
        status.HTTP_429_TOO_MANY_REQUESTS: {
            "description": "Too many authentication attempts from this IP.",
        },
    },
)


@router.post("/login", response_model=LoginResponse)
def login(
    request: Request,
    response: Response,
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> LoginResponse:
    ctx = get_request_client_context(request)
    attempted_email = normalize_login_email(str(payload.email))
    login_metadata = build_login_device_metadata(payload.device)

    user: User | None = get_user_for_login(db, attempted_email)

    if user is None:
        log_user_not_found_and_raise(
            db,
            ctx,
            reason="user_not_found",
            attempted_email=attempted_email,
            login_metadata=login_metadata,
        )

    ensure_user_is_active(
        db,
        user,
        ctx,
        attempted_email=attempted_email,
        login_metadata=login_metadata,
    )

    if not verify_password(payload.password, user.password):
        log_login_failure_action(
            db=db,
            user=user,
            client_ip=ctx.client_ip,
            proxy_ip=ctx.proxy_ip,
            user_agent=ctx.user_agent,
            reason="invalid_password",
            attempted_email=attempted_email,
            login_metadata=login_metadata,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    login_response = begin_login_after_credentials_verified(
        db,
        user,
        ctx,
        device_payload=payload.device,
        attempted_email=attempted_email,
        login_method="password",
        login_metadata=login_metadata,
    )
    if login_response.access_token:
        reset_auth_rate_limit_after_successful_login(request, response)
    return login_response


@router.post(
    "/login-token",
    response_model=LoginResponse,
    name="login_token",
    summary="Login via Token",
    description="Login using SSO exchange token (Okta)",
)
def login_token(
    request: Request,
    response: Response,
    payload: LoginTokenRequest,
    db: Session = Depends(get_db),
) -> LoginResponse:
    ctx = get_request_client_context(request)
    email = verify_sso_login_token(payload.access_token)
    attempted_email = normalize_login_email(email)
    login_metadata = build_login_device_metadata(payload.device)

    user: User | None = get_user_for_login(db, attempted_email)

    if user is None:
        log_user_not_found_and_raise(
            db,
            ctx,
            reason="sso_user_not_found",
            detail="No account found for this SSO user",
            attempted_email=attempted_email,
            login_method="sso",
            login_metadata=login_metadata,
        )

    ensure_user_is_active(
        db,
        user,
        ctx,
        failure_reason="sso_inactive_user",
        attempted_email=attempted_email,
        login_method="sso",
        login_metadata=login_metadata,
    )

    login_response = begin_login_after_credentials_verified(
        db,
        user,
        ctx,
        device_payload=payload.device,
        attempted_email=attempted_email,
        login_method="sso",
        login_metadata=login_metadata,
    )
    if login_response.access_token:
        reset_auth_rate_limit_after_successful_login(request, response)
    return login_response


@router.post(
    "/forgot-password",
    name="forgot_password",
    summary="Request password reset email",
    description=(
        "Starts a password reset for non-superadmin active users. Always returns the "
        "same success message to prevent email enumeration. When APP_ENV=dev, "
        "`debug.email_sent` and `debug.is_disallowed` indicate whether a token was "
        "issued and email queued. Subject to auth rate limiting and forgot-password "
        "IP blocking (12h after too many requests)."
    ),
    response_model=ForgotPasswordResponse,
    responses=FORGOT_PASSWORD_OPENAPI_RESPONSES,
)
def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> ForgotPasswordResponse:
    ctx = get_request_client_context(request)
    result = process_forgot_password(
        db,
        email=str(payload.email),
        ctx=ctx,
    )
    debug = None
    if is_development_environment():
        debug = ForgotPasswordDebugResponse(
            email_sent=result.email_sent,
            is_disallowed=result.is_disallowed,
        )
    return ForgotPasswordResponse(message=result.message, debug=debug)


@router.post(
    "/reset-password",
    name="reset_password",
    summary="Complete password reset",
    description=(
        "Sets a new password using the token from the forgot-password email link. "
        "Validates password strength with zxcvbn (score >= 3). Revokes all active "
        "sessions for the user on success."
    ),
    response_model=ResetPasswordResponse,
    responses=RESET_PASSWORD_OPENAPI_RESPONSES,
)
def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> ResetPasswordResponse:
    ctx = get_request_client_context(request)
    message = process_reset_password(
        db,
        token=payload.token,
        password=payload.password,
        confirm_password=payload.confirm_password,
        ctx=ctx,
    )
    return ResetPasswordResponse(message=message)
