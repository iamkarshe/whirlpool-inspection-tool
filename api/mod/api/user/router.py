import uuid

import bcrypt

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload, selectinload

from mod.api.middleware import auth_dependency
from mod.api.user.helper import (
    apply_user_facility_scope,
    forbid_superadmin_role_assignment,
    map_user_response,
    user_with_role_and_scope,
)
from mod.api.user.request import UserCreateRequest, UserUpdateRequest
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

router = APIRouter(
    tags=["Users"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api",
)


@router.get(
    "/users",
    name="get_users",
    description="Get all users",
    response_model=UserListResponse,
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
    description="Create a new user",
    response_model=UserResponse,
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
    db.commit()

    loaded = user_with_role_and_scope(db, user.uuid)
    if loaded is None:
        raise HTTPException(status_code=500, detail="User reload failed")
    return map_user_response(loaded)


@router.put(
    "/users/{user_uuid}",
    name="update_user",
    description="Update user",
    response_model=UserResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin"])
def update_user(
    request: Request,
    user_uuid: uuid.UUID,
    payload: UserUpdateRequest,
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

    db.commit()

    loaded = user_with_role_and_scope(db, user_uuid)
    if loaded is None:
        raise HTTPException(status_code=500, detail="User reload failed")
    return map_user_response(loaded)
