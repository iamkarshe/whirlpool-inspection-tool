import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from mod.api.middleware import auth_dependency
from mod.api.user.request import UserCreateRequest
from mod.api.user.response import UserResponse
from mod.model import Role, User
from utils.db import get_db
from utils.decorator import check_api_role

router = APIRouter(
    tags=["Users"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api",
)


@router.post(
    "/users",
    name="create_user",
    description="Create a new user",
    response_model=UserResponse,
)
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
    return user
