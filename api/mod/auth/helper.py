import datetime
import uuid
from dataclasses import dataclass

import jwt
from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload

from mod.auth.actions import (
    log_login_action,
    log_login_failure_action,
    upsert_device_action,
)
from mod.auth.device_helper import (
    build_login_device_context,
    list_active_devices_for_user,
)
from mod.auth.request import LoginDeviceInfo, ResolveDevicesRequest
from mod.auth.response import (
    ActiveDeviceListResponse,
    ActiveDeviceResponse,
    DeregisterDeviceResponse,
    LoginResponse,
    ResolveDevicesResponse,
)
from mod.auth.session import create_user_session, deregister_device
from mod.model import Device, User
from utils.common import normalize_login_email
from utils.env import get_allow_multi_login
from utils.ip_address import get_client_ip_address
from utils.jwt import ALGORITHM, SECRET_KEY, create_access_token

LOGIN_USER_LOAD_OPTIONS = (
    joinedload(User.role),
    joinedload(User.warehouses_scope),
)

SSO_LOGIN_TOKEN_TYPE = "sso_login"
SSO_LOGIN_TOKEN_EXPIRY_MINUTES = 15


@dataclass(frozen=True)
class RequestClientContext:
    client_ip: str | None
    proxy_ip: str | None
    user_agent: str | None


def get_user_for_login(db: Session, email: str) -> User | None:
    normalized_email = normalize_login_email(email)
    return (
        db.query(User)
        .options(*LOGIN_USER_LOAD_OPTIONS)
        .filter(User.email == normalized_email)
        .first()
    )


def get_request_client_context(request: Request) -> RequestClientContext:
    return RequestClientContext(
        client_ip=get_client_ip_address(request),
        proxy_ip=request.headers.get("X-Forwarded-For"),
        user_agent=request.headers.get("User-Agent"),
    )


def resolve_role_context(
    db: Session,
    user: User,
    ctx: RequestClientContext,
) -> tuple[str, list[str] | None]:
    role = user.role
    role_name = (role.role or "").strip() if role is not None else ""
    if role is None or not role.is_active or not role_name:
        log_login_failure_action(
            db=db,
            user=user,
            client_ip=ctx.client_ip,
            proxy_ip=ctx.proxy_ip,
            user_agent=ctx.user_agent,
            reason="missing_or_inactive_role",
            attempted_email=user.email,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no valid role assigned",
        )

    is_superadmin = role_name.lower() == "superadmin"
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
    allow_multi_login: bool,
    requires_device_selection: bool,
    active_devices: list[ActiveDeviceResponse],
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
        allow_multi_login=allow_multi_login,
        requires_device_selection=requires_device_selection,
        active_devices=active_devices,
    )


def ensure_user_is_active(
    db: Session,
    user: User,
    ctx: RequestClientContext,
    *,
    failure_reason: str = "inactive_user",
    attempted_email: str | None = None,
    login_method: str = "password",
    login_metadata: dict | None = None,
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
        attempted_email=attempted_email or user.email,
        login_method=login_method,
        login_metadata=login_metadata,
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
    attempted_email: str | None = None,
    login_method: str = "password",
    login_metadata: dict | None = None,
) -> None:
    log_login_failure_action(
        db=db,
        user=None,
        client_ip=ctx.client_ip,
        proxy_ip=ctx.proxy_ip,
        user_agent=ctx.user_agent,
        reason=reason,
        attempted_email=attempted_email,
        login_method=login_method,
        login_metadata=login_metadata,
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
    attempted_email: str | None = None,
    login_method: str = "password",
    login_metadata: dict | None = None,
) -> LoginResponse:
    role_name, allowed_warehouses = resolve_role_context(db, user, ctx)
    allow_multi_login = get_allow_multi_login()

    device = upsert_device_action(
        db=db,
        user=user,
        device_payload=device_payload,
        client_ip=ctx.client_ip,
        proxy_ip=ctx.proxy_ip,
    )
    device_id = device.id if device is not None else None
    access_token, jti, expires_at = create_access_token(
        user.id,
        device_id=device_id,
    )
    create_user_session(
        db,
        user_id=user.id,
        jti=jti,
        device_id=device_id,
        expires_at=expires_at,
    )
    log_login_action(
        db=db,
        user=user,
        device=device,
        access_token=access_token,
        client_ip=ctx.client_ip,
        proxy_ip=ctx.proxy_ip,
        user_agent=ctx.user_agent,
        attempted_email=attempted_email or user.email,
        login_method=login_method,
        login_metadata=login_metadata,
    )
    db.flush()

    current_device_uuid = device.uuid if device is not None else None
    active_devices, requires_device_selection = build_login_device_context(
        db,
        user.id,
        allow_multi_login=allow_multi_login,
        current_device_uuid=current_device_uuid,
        current_device_id=device_id,
    )

    db.commit()

    return build_login_response(
        user=user,
        role_name=role_name,
        allowed_warehouses=allowed_warehouses,
        access_token=access_token,
        device_uuid=current_device_uuid,
        allow_multi_login=allow_multi_login,
        requires_device_selection=requires_device_selection,
        active_devices=active_devices,
    )


def create_sso_login_token(email: str) -> str:
    normalized_email = normalize_login_email(email)
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

    return normalize_login_email(email)


def get_user_device_by_uuid_or_404(
    db: Session,
    user_id: int,
    device_uuid: uuid.UUID,
) -> Device:
    device = (
        db.query(Device)
        .filter(
            Device.uuid == device_uuid,
            Device.user_id == user_id,
        )
        .first()
    )
    if device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Device not found"
        )
    return device


def build_active_device_list_response(
    db: Session,
    user_id: int,
    *,
    current_device_uuid: uuid.UUID | None = None,
) -> ActiveDeviceListResponse:
    return ActiveDeviceListResponse(
        allow_multi_login=get_allow_multi_login(),
        devices=list_active_devices_for_user(
            db,
            user_id,
            current_device_uuid=current_device_uuid,
        ),
    )


def resolve_active_devices_for_user(
    db: Session,
    user_id: int,
    payload: ResolveDevicesRequest,
) -> ResolveDevicesResponse:
    if get_allow_multi_login():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device selection is not required when multi-login is enabled",
        )

    keep_uuids = list(dict.fromkeys(payload.keep_device_uuids))
    active_devices = (
        db.query(Device)
        .filter(
            Device.user_id == user_id,
            Device.is_active.is_(True),
        )
        .all()
    )
    active_by_uuid = {device.uuid: device for device in active_devices}

    unknown = [value for value in keep_uuids if value not in active_by_uuid]
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more devices are not active for this account",
        )

    kept: list[uuid.UUID] = []
    deregistered: list[uuid.UUID] = []
    keep_set = set(keep_uuids)

    for device in active_devices:
        if device.uuid in keep_set:
            kept.append(device.uuid)
            continue
        deregister_device(db, device)
        deregistered.append(device.uuid)

    return ResolveDevicesResponse(
        kept_device_uuids=kept,
        deregistered_device_uuids=deregistered,
    )


def deregister_user_device_by_uuid(
    db: Session,
    user_id: int,
    device_uuid: uuid.UUID,
) -> DeregisterDeviceResponse:
    device = get_user_device_by_uuid_or_404(db, user_id, device_uuid)
    if not device.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device is already deregistered",
        )
    deregister_device(db, device)
    return DeregisterDeviceResponse(device_uuid=device.uuid)
