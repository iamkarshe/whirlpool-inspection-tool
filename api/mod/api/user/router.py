import uuid

import bcrypt

from fastapi import APIRouter, Depends, HTTPException, Path, Request, Response
from sqlalchemy.orm import Session, joinedload, selectinload

from mod.api.log.audit import log_user_added, log_user_updated
from mod.api.middleware import auth_dependency
from mod.api.user.helper import (
    apply_user_facility_scope,
    download_user_vpn_config,
    download_user_vpn_qr,
    forbid_superadmin_role_assignment,
    generate_user_vpn_profile,
    map_user_response,
    revoke_user_vpn_by_uuid,
    revoke_user_vpn_profile,
    user_with_role_and_scope,
)
from mod.api.user.request import (
    UserCreateRequest,
    UserGenerateVpnRequest,
    UserUpdateRequest,
)
from mod.api.user.response import UserListResponse, UserResponse
from mod.model import Role, User
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator
from utils.pagination import (
    PaginationParams,
    apply_standard_filters,
    build_paginated_response,
    get_pagination_params,
)
from mod.api.reports.kpi_parameters_cache import invalidate_kpi_parameters_cache

router = APIRouter(
    tags=["Users"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api",
)


@router.get(
    "/users",
    name="get_users",
    summary="List users",
    description=(
        "Paginated user directory for superadmin. "
        "Supports search, sort, and created_at / updated_at date filters."
    ),
    response_model=UserListResponse,
    responses={
        403: {"description": "Caller is not superadmin."},
    },
)
@exception_handler_decorator
@check_api_role(["superadmin"])
def get_users(
    request: Request,
    params: PaginationParams = Depends(get_pagination_params),
    db: Session = Depends(get_db),
):
    query = db.query(User).options(
        joinedload(User.role),
        selectinload(User.warehouses_scope),
        selectinload(User.plants_scope),
    )

    query = apply_standard_filters(
        query=query,
        params=params,
        search_columns=[User.name, User.email, User.mobile_number],
        date_fields={
            "created_at": User.created_at,
            "updated_at": User.updated_at,
        },
        sort_fields={
            "id": User.id,
            "name": User.name,
            "email": User.email,
            "created_at": User.created_at,
            "updated_at": User.updated_at,
        },
        default_sort_field="id",
    )

    return build_paginated_response(
        query=query,
        page=params.page,
        per_page=params.per_page,
        mapper=map_user_response,
    )


@router.post(
    "/users",
    name="create_user",
    summary="Create user",
    description=(
        "Creates an active user with hashed password and facility scope. "
        "Roles allowed: operator, manager, biz-admin."
    ),
    response_model=UserResponse,
    responses={
        409: {"description": "Email or mobile number already in use."},
        422: {"description": "Unknown role or invalid body."},
    },
)
@exception_handler_decorator
@check_api_role(["superadmin"])
def create_user(
    request: Request,
    payload: UserCreateRequest,
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.email == str(payload.email)).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email already exists")

    existing_mobile = (
        db.query(User).filter(User.mobile_number == payload.mobile_number).first()
    )
    if existing_mobile is not None:
        raise HTTPException(status_code=409, detail="Mobile number already exists")

    role = db.query(Role).filter(Role.role == payload.role).first()
    if role is None:
        raise HTTPException(status_code=422, detail="Invalid role")
    forbid_superadmin_role_assignment(role)

    password_hash_str = bcrypt.hashpw(
        payload.password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")

    user = User(
        name=payload.name,
        email=str(payload.email),
        mobile_number=payload.mobile_number,
        designation=payload.designation,
        password=password_hash_str,
        role_id=role.id,
        is_active=True,
    )
    db.add(user)
    db.flush()

    apply_user_facility_scope(
        db,
        user,
        warehouse_codes=payload.allowed_warehouse,
        plant_codes=payload.allowed_plants,
    )
    log_user_added(
        db,
        actor_user_id=int(request.state.user_id),
        target_user_uuid=str(user.uuid),
        target_email=user.email,
        target_name=user.name,
        target_role=role.role,
    )

    invalidate_kpi_parameters_cache()
    db.commit()

    loaded = user_with_role_and_scope(db, user.uuid)
    if loaded is None:
        raise HTTPException(status_code=500, detail="User reload failed")
    return map_user_response(loaded)


@router.post(
    "/users/generate-vpn",
    name="generate_user_vpn",
    summary="Generate VPN profile",
    description=(
        "Provisions one VPN device for the user via the VPN provision service. "
        "Replacing an existing profile revokes the old device first. "
        "Requires VPN_PROVISION_SERVER and VPN_PROVISION_KEY."
    ),
    response_model=UserResponse,
    responses={
        403: {"description": "Target user is superadmin."},
        404: {"description": "User not found."},
        503: {"description": "VPN provision service not configured."},
    },
)
@exception_handler_decorator
@check_api_role(["superadmin"])
def generate_user_vpn(
    request: Request,
    payload: UserGenerateVpnRequest,
    db: Session = Depends(get_db),
):
    user = generate_user_vpn_profile(
        db,
        user_uuid=payload.user_uuid,
        device_name=payload.device_name,
        device_type=payload.device_type,
    )
    return map_user_response(user)


@router.get(
    "/users/{user_uuid}/vpn/config",
    name="download_user_vpn_config",
    summary="Download VPN config",
    description=(
        "Returns the WireGuard config file for the user's provisioned device. "
        "Response body and Content-Type come from the VPN provision server."
    ),
    responses={
        200: {
            "description": "WireGuard configuration file.",
            "content": {
                "application/octet-stream": {},
                "text/plain": {},
            },
        },
        404: {"description": "User not found or no VPN profile."},
        503: {"description": "VPN provision service not configured."},
    },
)
@exception_handler_decorator
@check_api_role(["superadmin"])
def get_user_vpn_config(
    request: Request,
    user_uuid: uuid.UUID = Path(..., description="User UUID."),
    db: Session = Depends(get_db),
) -> Response:
    user = user_with_role_and_scope(db, user_uuid)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return download_user_vpn_config(user)


@router.get(
    "/users/{user_uuid}/vpn/qr",
    name="download_user_vpn_qr",
    summary="Download VPN QR code",
    description=(
        "Returns a QR image for importing the VPN profile on a device. "
        "Usually image/png from the provision server."
    ),
    responses={
        200: {
            "description": "VPN QR code image.",
            "content": {"image/png": {}, "image/jpeg": {}},
        },
        404: {"description": "User not found or no VPN profile."},
        503: {"description": "VPN provision service not configured."},
    },
)
@exception_handler_decorator
@check_api_role(["superadmin"])
def get_user_vpn_qr(
    request: Request,
    user_uuid: uuid.UUID = Path(..., description="User UUID."),
    db: Session = Depends(get_db),
) -> Response:
    user = user_with_role_and_scope(db, user_uuid)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return download_user_vpn_qr(user)


@router.get(
    "/users/{user_uuid}/vpn/revoke",
    name="revoke_user_vpn",
    summary="Revoke VPN profile",
    description=(
        "Revokes the user's VPN device on the provision server and clears "
        "stored VPN profile fields on the user record."
    ),
    response_model=UserResponse,
    responses={
        403: {"description": "Target user is superadmin."},
        404: {"description": "User not found or no VPN profile."},
        503: {"description": "VPN provision service not configured."},
    },
)
@exception_handler_decorator
@check_api_role(["superadmin"])
def revoke_user_vpn(
    request: Request,
    user_uuid: uuid.UUID = Path(..., description="User UUID."),
    db: Session = Depends(get_db),
):
    user = revoke_user_vpn_by_uuid(db, user_uuid)
    return map_user_response(user)


@router.put(
    "/users/{user_uuid}",
    name="update_user",
    summary="Update user",
    description=(
        "Partial update: send only fields to change. "
        "Set is_active to false to deactivate; VPN is revoked automatically. "
        "Superadmin accounts cannot be edited."
    ),
    response_model=UserResponse,
    responses={
        403: {"description": "Target user is superadmin."},
        404: {"description": "User not found."},
        409: {"description": "Email or mobile number already in use."},
    },
)
@exception_handler_decorator
@check_api_role(["superadmin"])
def update_user(
    request: Request,
    user_uuid: uuid.UUID = Path(..., description="User UUID."),
    payload: UserUpdateRequest = ...,
    db: Session = Depends(get_db),
):
    user = user_with_role_and_scope(db, user_uuid)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if (user.role.role or "").lower() == "superadmin":
        raise HTTPException(status_code=403, detail="Cannot modify superadmin accounts")

    if payload.email is not None and str(payload.email) != user.email:
        clash = (
            db.query(User)
            .filter(User.email == str(payload.email), User.id != user.id)
            .first()
        )
        if clash is not None:
            raise HTTPException(status_code=409, detail="Email already exists")
        user.email = str(payload.email)

    if (
        payload.mobile_number is not None
        and payload.mobile_number != user.mobile_number
    ):
        clash = (
            db.query(User)
            .filter(User.mobile_number == payload.mobile_number, User.id != user.id)
            .first()
        )
        if clash is not None:
            raise HTTPException(status_code=409, detail="Mobile number already exists")
        user.mobile_number = payload.mobile_number

    if payload.name is not None:
        user.name = payload.name
    if payload.designation is not None:
        user.designation = payload.designation
    if payload.is_active is not None:
        if payload.is_active is False:
            revoke_user_vpn_profile(user)
        user.is_active = payload.is_active

    if payload.password is not None:
        user.password = bcrypt.hashpw(
            payload.password.encode("utf-8"),
            bcrypt.gensalt(),
        ).decode("utf-8")

    if payload.role is not None:
        role = db.query(Role).filter(Role.role == payload.role).first()
        if role is None:
            raise HTTPException(status_code=422, detail="Invalid role")
        forbid_superadmin_role_assignment(role)
        user.role_id = role.id

    apply_user_facility_scope(
        db,
        user,
        warehouse_codes=payload.allowed_warehouse,
        plant_codes=payload.allowed_plants,
    )

    changed_fields = list(payload.model_dump(exclude_unset=True).keys())
    if payload.is_active is False:
        summary = f"User {user.name} ({user.email}) deactivated"
    elif changed_fields:
        summary = (
            f"User {user.name} ({user.email}) updated: {', '.join(changed_fields)}"
        )
    else:
        summary = f"User {user.name} ({user.email}) updated"
    log_user_updated(
        db,
        actor_user_id=int(request.state.user_id),
        target_user_uuid=str(user.uuid),
        target_email=user.email,
        summary=summary,
    )
    from mod.api.reports.kpi_parameters_cache import invalidate_kpi_parameters_cache

    invalidate_kpi_parameters_cache()
    db.commit()

    loaded = user_with_role_and_scope(db, user_uuid)
    if loaded is None:
        raise HTTPException(status_code=500, detail="User reload failed")
    return map_user_response(loaded)
