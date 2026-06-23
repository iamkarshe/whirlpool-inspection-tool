from __future__ import annotations

import datetime
from dataclasses import dataclass
from typing import Any

import jwt
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from mod.auth.helper import (
    LOGIN_USER_LOAD_OPTIONS,
    RequestClientContext,
    complete_login,
    resolve_role_context,
)
from mod.auth.request import LoginDeviceInfo
from mod.auth.response import LoginResponse, TwoFactorSetupStartResponse
from mod.model import User
from utils.change_password_otp import is_change_password_otp_required_for_user
from utils.jwt import ALGORITHM, SECRET_KEY
from utils.password_policy import resolve_password_change_flags
from utils.two_factor import (
    build_provisioning_uri,
    encrypt_totp_secret,
    generate_totp_secret,
    two_factor_issuer,
    user_has_two_factor_enabled,
    user_has_two_factor_enforced,
    user_requires_two_factor_at_login,
    user_requires_two_factor_setup_at_login,
    verify_user_totp_code,
)

MFA_PENDING_TOKEN_TYPE = "mfa_pending"
MFA_PENDING_MODE_VERIFY = "verify"
MFA_PENDING_MODE_SETUP = "setup"
MFA_PENDING_TOKEN_EXPIRY_MINUTES = 10


@dataclass(frozen=True)
class MfaPendingLoginContext:
    user_id: int
    mode: str
    device_payload: LoginDeviceInfo | None
    login_method: str
    attempted_email: str | None
    login_metadata: dict[str, Any] | None


def serialize_device_payload(device_payload: LoginDeviceInfo | None) -> dict[str, Any] | None:
    if device_payload is None:
        return None
    return device_payload.model_dump(mode="json")


def deserialize_device_payload(
    raw_payload: dict[str, Any] | None,
) -> LoginDeviceInfo | None:
    if not raw_payload:
        return None
    return LoginDeviceInfo.model_validate(raw_payload)


def create_mfa_pending_token(
    *,
    user_id: int,
    mode: str,
    device_payload: LoginDeviceInfo | None = None,
    login_method: str = "password",
    attempted_email: str | None = None,
    login_metadata: dict[str, Any] | None = None,
) -> str:
    payload = {
        "typ": MFA_PENDING_TOKEN_TYPE,
        "sub": str(user_id),
        "mode": mode,
        "device": serialize_device_payload(device_payload),
        "login_method": login_method,
        "attempted_email": attempted_email,
        "login_metadata": login_metadata or {},
        "exp": datetime.datetime.now(datetime.timezone.utc)
        + datetime.timedelta(minutes=MFA_PENDING_TOKEN_EXPIRY_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_mfa_pending_token(token: str) -> MfaPendingLoginContext:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Two-factor login session expired, please sign in again",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid two-factor login session",
        )

    if payload.get("typ") != MFA_PENDING_TOKEN_TYPE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid two-factor login session",
        )

    user_id_raw = payload.get("sub")
    mode = str(payload.get("mode") or "").strip().lower()
    if user_id_raw is None or mode not in {MFA_PENDING_MODE_VERIFY, MFA_PENDING_MODE_SETUP}:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid two-factor login session",
        )

    return MfaPendingLoginContext(
        user_id=int(user_id_raw),
        mode=mode,
        device_payload=deserialize_device_payload(payload.get("device")),
        login_method=str(payload.get("login_method") or "password"),
        attempted_email=payload.get("attempted_email"),
        login_metadata=payload.get("login_metadata") or {},
    )


def get_user_for_two_factor(db: Session, user_id: int) -> User:
    user = (
        db.query(User)
        .options(*LOGIN_USER_LOAD_OPTIONS)
        .filter(
            User.id == user_id,
            User.is_active.is_(True),
        )
        .first()
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


def build_mfa_pending_login_response(
    *,
    user: User,
    mfa_pending_token: str,
    mfa_required: bool,
    mfa_setup_required: bool,
) -> LoginResponse:
    role_name, allowed_warehouses = _resolve_role_context_without_failure(user)
    must_change_password, password_expired = resolve_password_change_flags(user)
    return LoginResponse(
        id=user.id,
        uuid=user.uuid,
        name=user.name,
        email=user.email,
        role=role_name,
        designation=user.designation,
        is_active=user.is_active,
        access_token="",
        device_uuid=None,
        allowed_warehouses=allowed_warehouses,
        allow_multi_login=True,
        requires_device_selection=False,
        active_devices=[],
        must_change_password=must_change_password,
        password_expired=password_expired,
        change_password_otp_required=is_change_password_otp_required_for_user(user),
        mfa_required=mfa_required,
        mfa_setup_required=mfa_setup_required,
        mfa_pending_token=mfa_pending_token,
        two_factor_enabled=user_has_two_factor_enabled(user),
        two_factor_enforced=user_has_two_factor_enforced(user),
    )


def _resolve_role_context_without_failure(user: User) -> tuple[str, list[str] | None]:
    role = user.role
    role_name = (role.role or "").strip() if role is not None else ""
    is_superadmin = role_name.lower() == "superadmin"
    allowed_warehouses: list[str] | None = (
        None if is_superadmin else list(user.allowed_warehouse)
    )
    return role_name, allowed_warehouses


def begin_login_after_credentials_verified(
    db: Session,
    user: User,
    ctx: RequestClientContext,
    *,
    device_payload: LoginDeviceInfo | None = None,
    attempted_email: str | None = None,
    login_method: str = "password",
    login_metadata: dict[str, Any] | None = None,
) -> LoginResponse:
    if user_requires_two_factor_setup_at_login(user):
        pending_token = create_mfa_pending_token(
            user_id=user.id,
            mode=MFA_PENDING_MODE_SETUP,
            device_payload=device_payload,
            login_method=login_method,
            attempted_email=attempted_email,
            login_metadata=login_metadata,
        )
        return build_mfa_pending_login_response(
            user=user,
            mfa_pending_token=pending_token,
            mfa_required=False,
            mfa_setup_required=True,
        )

    if user_requires_two_factor_at_login(user):
        pending_token = create_mfa_pending_token(
            user_id=user.id,
            mode=MFA_PENDING_MODE_VERIFY,
            device_payload=device_payload,
            login_method=login_method,
            attempted_email=attempted_email,
            login_metadata=login_metadata,
        )
        return build_mfa_pending_login_response(
            user=user,
            mfa_pending_token=pending_token,
            mfa_required=True,
            mfa_setup_required=False,
        )

    return complete_login(
        db,
        user,
        ctx,
        device_payload=device_payload,
        attempted_email=attempted_email,
        login_method=login_method,
        login_metadata=login_metadata,
    )


def start_pending_login_two_factor_setup(
    db: Session,
    *,
    mfa_pending_token: str,
) -> TwoFactorSetupStartResponse:
    pending = verify_mfa_pending_token(mfa_pending_token)
    if pending.mode != MFA_PENDING_MODE_SETUP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-factor setup is not required for this login session",
        )

    user = get_user_for_two_factor(db, pending.user_id)
    secret = generate_totp_secret()
    user.two_factor_secret = encrypt_totp_secret(secret)
    user.two_factor_enabled = False
    user.two_factor_enabled_at = None
    db.flush()

    return TwoFactorSetupStartResponse(
        secret_key=secret,
        provisioning_uri=build_provisioning_uri(secret=secret, account_name=user.email),
        issuer=two_factor_issuer(),
    )


def start_authenticated_two_factor_setup(db: Session, user: User) -> TwoFactorSetupStartResponse:
    secret = generate_totp_secret()
    user.two_factor_secret = encrypt_totp_secret(secret)
    user.two_factor_enabled = False
    user.two_factor_enabled_at = None
    db.flush()

    provisioning_uri = build_provisioning_uri(secret=secret, account_name=user.email)
    return TwoFactorSetupStartResponse(
        secret_key=secret,
        provisioning_uri=provisioning_uri,
        issuer=two_factor_issuer(),
    )


def confirm_two_factor_setup(db: Session, user: User, totp_code: str) -> None:
    if not user.two_factor_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-factor setup has not been started",
        )
    if not verify_user_totp_code(user, totp_code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authenticator code",
        )
    user.two_factor_enabled = True
    user.two_factor_enabled_at = datetime.datetime.now(datetime.timezone.utc)


def complete_login_with_two_factor(
    db: Session,
    ctx: RequestClientContext,
    *,
    mfa_pending_token: str,
    totp_code: str,
) -> LoginResponse:
    pending = verify_mfa_pending_token(mfa_pending_token)
    user = get_user_for_two_factor(db, pending.user_id)

    if pending.mode == MFA_PENDING_MODE_SETUP:
        if not user.two_factor_secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Call POST /auth/login/2fa/setup before verifying the code",
            )
        if not verify_user_totp_code(user, totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authenticator code",
            )
        user.two_factor_enabled = True
        user.two_factor_enabled_at = datetime.datetime.now(datetime.timezone.utc)
        db.flush()
    else:
        if not user_has_two_factor_enabled(user):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Two-factor authentication is not enabled for this account",
            )
        if not verify_user_totp_code(user, totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authenticator code",
            )

    resolve_role_context(db, user, ctx)
    return complete_login(
        db,
        user,
        ctx,
        device_payload=pending.device_payload,
        attempted_email=pending.attempted_email,
        login_method=pending.login_method,
        login_metadata=pending.login_metadata,
    )


def reset_user_two_factor(user: User) -> None:
    user.two_factor_secret = None
    user.two_factor_enabled = False
    user.two_factor_enabled_at = None


def disable_user_two_factor(db: Session, user: User, *, totp_code: str) -> None:
    if user_has_two_factor_enforced(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Two-factor authentication is required for this account and cannot be disabled",
        )
    if not user_has_two_factor_enabled(user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-factor authentication is not enabled",
        )
    if not verify_user_totp_code(user, totp_code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authenticator code",
        )
    reset_user_two_factor(user)


def build_two_factor_status(user: User) -> dict[str, bool]:
    return {
        "two_factor_enabled": user_has_two_factor_enabled(user),
        "two_factor_enforced": user_has_two_factor_enforced(user),
        "two_factor_setup_required": user_requires_two_factor_setup_at_login(user),
    }
