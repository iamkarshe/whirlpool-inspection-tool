from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session, joinedload

from mod.api.middleware import auth_dependency
from mod.auth.helper import get_request_client_context
from mod.auth.request import (
    LoginTwoFactorSetupRequest,
    LoginVerifyTwoFactorRequest,
    TwoFactorConfirmRequest,
    TwoFactorDisableRequest,
    TwoFactorResetRequest,
)
from mod.auth.response import (
    LoginResponse,
    TwoFactorConfirmResponse,
    TwoFactorDisableResponse,
    TwoFactorResetResponse,
    TwoFactorSetupStartResponse,
    TwoFactorStatusResponse,
)
from mod.auth.two_factor_helper import (
    build_two_factor_status,
    complete_login_with_two_factor,
    confirm_two_factor_setup,
    disable_user_two_factor,
    reset_user_two_factor_self,
    start_authenticated_two_factor_setup,
    start_pending_login_two_factor_setup,
)
from mod.model import User
from utils.two_factor import user_has_two_factor_enforced
from utils.auth_rate_limit import (
    require_auth_rate_limit,
    reset_auth_rate_limit_after_successful_login,
)
from utils.db import get_db

router = APIRouter(tags=["Auth"], prefix="/auth")


@router.post(
    "/login/verify-2fa",
    response_model=LoginResponse,
    name="login_verify_two_factor",
    summary="Complete login with authenticator code",
    description=(
        "Second step after POST /auth/login or POST /auth/login-token when "
        "mfa_required or mfa_setup_required is true."
    ),
    dependencies=[Depends(require_auth_rate_limit)],
)
def login_verify_two_factor(
    request: Request,
    response: Response,
    payload: LoginVerifyTwoFactorRequest,
    db: Session = Depends(get_db),
) -> LoginResponse:
    ctx = get_request_client_context(request)
    login_response = complete_login_with_two_factor(
        db,
        ctx,
        mfa_pending_token=payload.mfa_pending_token,
        totp_code=payload.totp_code,
    )
    db.commit()
    reset_auth_rate_limit_after_successful_login(request, response)
    return login_response


@router.post(
    "/login/2fa/setup",
    response_model=TwoFactorSetupStartResponse,
    name="login_start_two_factor_setup",
    summary="Start enforced 2FA enrollment during login",
    description=(
        "Returns the TOTP secret and provisioning URI after password/SSO verification "
        "when mfa_setup_required is true. Scan the QR code, then call "
        "POST /auth/login/verify-2fa with the first code."
    ),
    dependencies=[Depends(require_auth_rate_limit)],
)
def login_start_two_factor_setup(
    payload: LoginTwoFactorSetupRequest,
    db: Session = Depends(get_db),
) -> TwoFactorSetupStartResponse:
    result = start_pending_login_two_factor_setup(
        db,
        mfa_pending_token=payload.mfa_pending_token,
    )
    db.commit()
    return result


authenticated_router = APIRouter(
    tags=["Auth"],
    prefix="/auth",
    dependencies=[Depends(auth_dependency)],
)


@authenticated_router.get(
    "/2fa/status",
    response_model=TwoFactorStatusResponse,
    name="get_two_factor_status",
    summary="Get current user's 2FA status",
)
def get_two_factor_status(
    request: Request,
    db: Session = Depends(get_db),
) -> TwoFactorStatusResponse:
    user = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.id == int(request.state.user_id))
        .first()
    )
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    status_payload = build_two_factor_status(user)
    return TwoFactorStatusResponse(**status_payload)


@authenticated_router.post(
    "/2fa/setup",
    response_model=TwoFactorSetupStartResponse,
    name="start_two_factor_setup",
    summary="Start personal 2FA enrollment",
    description=(
        "Generates a new TOTP secret and provisioning URI. "
        "Confirm with POST /auth/2fa/confirm before 2FA is enabled."
    ),
)
def start_two_factor_setup(
    request: Request,
    db: Session = Depends(get_db),
) -> TwoFactorSetupStartResponse:
    user = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.id == int(request.state.user_id))
        .first()
    )
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    result = start_authenticated_two_factor_setup(db, user)
    db.commit()
    return result


@authenticated_router.post(
    "/2fa/confirm",
    response_model=TwoFactorConfirmResponse,
    name="confirm_two_factor_setup",
    summary="Confirm personal 2FA enrollment",
)
def confirm_two_factor_setup_route(
    request: Request,
    payload: TwoFactorConfirmRequest,
    db: Session = Depends(get_db),
) -> TwoFactorConfirmResponse:
    user = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.id == int(request.state.user_id))
        .first()
    )
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    confirm_two_factor_setup(db, user, payload.totp_code)
    db.commit()
    return TwoFactorConfirmResponse()


@authenticated_router.post(
    "/2fa/disable",
    response_model=TwoFactorDisableResponse,
    name="disable_two_factor",
    summary="Disable personal 2FA",
    description="Not allowed when an administrator has enforced 2FA for the account.",
)
def disable_two_factor_route(
    request: Request,
    payload: TwoFactorDisableRequest,
    db: Session = Depends(get_db),
) -> TwoFactorDisableResponse:
    user = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.id == int(request.state.user_id))
        .first()
    )
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    disable_user_two_factor(db, user, totp_code=payload.totp_code)
    db.commit()
    return TwoFactorDisableResponse()


@authenticated_router.post(
    "/2fa/reset",
    response_model=TwoFactorResetResponse,
    name="reset_two_factor_self",
    summary="Reset your own two-factor authentication",
    description=(
        "Clears the authenticated user's TOTP secret using their account password. "
        "Use when the user lost their authenticator app but still has an active session, "
        "or wants to enroll a new device. Only the signed-in user can reset their own 2FA. "
        "When two_factor_enforced is true, the user must enroll again before the next login."
    ),
)
def reset_two_factor_self_route(
    request: Request,
    payload: TwoFactorResetRequest,
    db: Session = Depends(get_db),
) -> TwoFactorResetResponse:
    user = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.id == int(request.state.user_id))
        .first()
    )
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    reset_user_two_factor_self(db, user, current_password=payload.current_password)
    db.commit()
    return TwoFactorResetResponse(
        user_uuid=user.uuid,
        two_factor_enforced=user_has_two_factor_enforced(user),
    )
