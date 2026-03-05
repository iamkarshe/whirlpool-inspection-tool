from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from mod.api.auth.request import LoginRequest
from mod.api.auth.response import LoginResponse
from mod.model import Role, User
from utils.db import get_db
from utils.password import verify_password

router = APIRouter(tags=["Auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user: User | None = db.query(User).filter(User.email == str(payload.email)).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )

    if not verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    role: Role | None = db.query(Role).filter(Role.id == user.role_id).first()
    role_name = role.role

    return LoginResponse(
        id=user.id,
        uuid=user.uuid,
        name=user.name,
        email=user.email,
        role=role_name,
        designation=user.designation,
        is_active=user.is_active,
    )
