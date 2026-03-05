from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from mod.api.user.request import UserCreateRequest
from mod.api.user.response import UserResponse
from mod.model import User, UserRole
from utils.db import get_db

router = APIRouter(tags=["Users"])


@router.post("/users", response_model=UserResponse)
def create_user(payload: UserCreateRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == str(payload.email)).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email already exists")

    try:
        role = UserRole(payload.role)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid role")

    user = User(
        full_name=payload.full_name,
        email=str(payload.email),
        password_hash=payload.password,
        role=role,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return UserResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role.value,
        is_active=user.is_active,
    )
