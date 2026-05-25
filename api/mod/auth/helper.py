import datetime
from dataclasses import dataclass

import jwt
from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from mod.auth.actions import (
    log_login_action,
    log_login_failure_action,
    upsert_device_action,
)
from mod.auth.request import LoginDeviceInfo
from mod.auth.response import LoginResponse
from mod.model import Role, User
from utils.jwt import ALGORITHM, SECRET_KEY, create_access_token

SSO_LOGIN_TOKEN_TYPE = "sso_login"
SSO_LOGIN_TOKEN_EXPIRY_MINUTES = 15


@dataclass(frozen=True)
class RequestClientContext:
    client_ip: str | None
    proxy_ip: str | None
    user_agent: str | None


def get_request_client_context(request: Request) -> RequestClientContext:
    return RequestClientContext(
        client_ip=request.client.host if request.client else None,
        proxy_ip=request.headers.get("X-Forwarded-For"),
        user_agent=request.headers.get("User-Agent"),
    )


def resolve_role_context(
    db: Session, user: User
) -> tuple[str, list[str] | None]:
    role: Role | None = db.query(Role).filter(Role.id == user.role_id).first()
    role_name = role.role if role is not None else ""
    is_superadmin = (role_name or "").lower() == "superadmin"
    allowed_warehouses: list[str] | None = (
        None if is_superadmin else list(user.allowed_warehouse)
    )
    return role_name, allowed_warehouses


def build_login_response(
    *,
    user: User,
    role_name: str,
    allowed_warehouses: list[str] | None,
    access_token: str,
    device_uuid,
) -> LoginResponse:
    return LoginResponse(
        id=user.id,
        uuid=user.uuid,
        name=user.name,
        email=user.email,
        role=role_name,
        designation=user.designation,
        is_active=user.is_active,
        access_token=access_token,
        device_uuid=device_uuid,
        allowed_warehouses=allowed_warehouses,
    )


def ensure_user_is_active(
    db: Session,
    user: User,
    ctx: RequestClientContext,
    *,
    failure_reason: str = "inactive_user",
) -> None:
    if user.is_active:
        return

    log_login_failure_action(
        db=db,
        user=user,
        client_ip=ctx.client_ip,
        proxy_ip=ctx.proxy_ip,
        user_agent=ctx.user_agent,
        reason=failure_reason,
    )
    db.commit()
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="User is inactive",
    )


def log_user_not_found_and_raise(
    db: Session,
    ctx: RequestClientContext,
    *,
    reason: str,
    detail: str = "Invalid email or password",
) -> None:
    log_login_failure_action(
        db=db,
        user=None,
        client_ip=ctx.client_ip,
        proxy_ip=ctx.proxy_ip,
        user_agent=ctx.user_agent,
        reason=reason,
    )
    db.commit()
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
    )


def complete_login(
    db: Session,
    user: User,
    ctx: RequestClientContext,
    *,
    device_payload: LoginDeviceInfo | None = None,
) -> LoginResponse:
    role_name, allowed_warehouses = resolve_role_context(db, user)
    access_token = create_access_token(user_id=user.id)

    device = upsert_device_action(
        db=db,
        user=user,
        device_payload=device_payload,
        client_ip=ctx.client_ip,
        proxy_ip=ctx.proxy_ip,
    )
    log_login_action(
        db=db,
        user=user,
        device=device,
        access_token=access_token,
        client_ip=ctx.client_ip,
        proxy_ip=ctx.proxy_ip,
        user_agent=ctx.user_agent,
    )
    db.commit()

    return build_login_response(
        user=user,
        role_name=role_name,
        allowed_warehouses=allowed_warehouses,
        access_token=access_token,
        device_uuid=device.uuid if device is not None else None,
    )


def create_sso_login_token(email: str) -> str:
    """Short-lived token exchanged via /auth/login-token after Okta SSO redirect."""
    normalized_email = email.strip().lower()
    payload = {
        "typ": SSO_LOGIN_TOKEN_TYPE,
        "email": normalized_email,
        "exp": datetime.datetime.now(datetime.timezone.utc)
        + datetime.timedelta(minutes=SSO_LOGIN_TOKEN_EXPIRY_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_sso_login_token(token: str) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="SSO login token expired, please sign in again",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid SSO login token",
        )

    if payload.get("typ") != SSO_LOGIN_TOKEN_TYPE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid SSO login token",
        )

    email = payload.get("email")
    if not email or not isinstance(email, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid SSO login token",
        )

    return email.strip().lower()
