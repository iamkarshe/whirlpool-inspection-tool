import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session

from mod.api.middleware import auth_dependency
from mod.api.user.request import UserCreateRequest
from mod.api.user.response import UserListResponse, UserResponse
from mod.model import Role, User
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator
from utils.pagination import build_paginated_response

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
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(User).order_by(User.id.asc())

    def mapper(user: User) -> UserResponse:
        return UserResponse(
            id=user.id,
            uuid=user.uuid,
            name=user.name,
            email=user.email,
            mobile_number=user.mobile_number,
            role=user.role.role,
            designation=user.designation,
            is_active=bool(user.is_active),
        )

    return build_paginated_response(
        query=query,
        page=page,
        per_page=per_page,
        mapper=mapper,
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

    try:
        role = db.query(Role).filter(Role.role == payload.role).first()
        if role is None:
            raise HTTPException(status_code=422, detail="Invalid role")
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid role")

    password_hash = bcrypt.hashpw(payload.password.encode("utf-8"), bcrypt.gensalt())
    password_hash_str = password_hash.decode("utf-8")

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
    db.commit()
    db.refresh(user)

    return UserResponse(
        id=user.id,
        uuid=user.uuid,
        name=user.name,
        email=user.email,
        mobile_number=user.mobile_number,
        role=user.role.role,
        designation=user.designation,
        is_active=bool(user.is_active),
    )
